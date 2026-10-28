// Expected-rush estimate (explainable, no black box).
// score = typical demand for this kind of place at this hour/day  (+ this facility's own booking history, once it exists)
//         combined with how full the facility already is for that time (live bookings).
// This is a rule-based estimate, NOT a trained model: it becomes more accurate as real booking history builds up.
const db = require('../db/database');
const TZ = process.env.TZ_NAME || 'Asia/Kolkata';
const ml = require('./mlrush');
const { eventsFor, dowOf } = require('./events');
const modelProf = (fid, ymd) => (ml.getModel(fid) ? ml.predictDay(fid, ymd).map((x) => x.pred) : null);

const fmtr = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false });
function local(date) {
  const p = Object.fromEntries(fmtr.formatToParts(date).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), weekend: p.weekday === 'Sat' || p.weekday === 'Sun', ymd: `${p.year}-${p.month}-${p.day}` };
}
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
const levelOf = (s) => (s < 0.30 ? ['Low', 'low'] : s < 0.55 ? ['Moderate', 'mod'] : s < 0.78 ? ['High', 'high'] : ['Very high', 'vh']);

/* typical demand (0..1) by hour for weekdays (wd) and weekends (we), per kind of place */
const g = (h, c, w, a) => a * Math.exp(-((h - c) ** 2) / (2 * w * w));
const curve = (base, peaks) => Array.from({ length: 24 }, (_, h) =>
  Math.min(1, base * (h < 6 || h >= 23 ? 0.35 : 1) + peaks.reduce((s, [c, w, a]) => s + g(h, c, w, a), 0)));
const PROFILES = {
  mall:        { wd: curve(0.15, [[13, 2.2, 0.35], [19, 2.0, 0.55]]), we: curve(0.25, [[12.5, 2.5, 0.45], [17.5, 2.6, 0.6], [20, 1.6, 0.35]]) },
  garage:      { wd: curve(0.15, [[10, 1.8, 0.55], [14, 2.0, 0.30], [18, 1.8, 0.45]]), we: curve(0.15, [[12, 2.5, 0.4], [18, 2.2, 0.4]]) },
  open_ground: { wd: curve(0.10, [[18, 2.2, 0.40]]), we: curve(0.20, [[11, 2.5, 0.45], [18, 2.5, 0.5]]) },
  other:       { wd: curve(0.15, [[9, 1.5, 0.5], [18, 1.8, 0.55]]), we: curve(0.15, [[12, 3, 0.4], [18, 2.5, 0.4]]) },
};
PROFILES.street = PROFILES.other;
const profOf = (kind) => PROFILES[kind] || PROFILES.other;

function history(fid, totalSlots) {
  const since = new Date(Date.now() - 56 * 864e5).toISOString();
  const rows = db.prepare(`SELECT start_time, end_time FROM bookings WHERE facility_id=?
    AND status IN ('completed','checked_in','awaiting_payment') AND start_time >= ?`).all(fid, since);
  if (!rows.length || !totalSlots) return { n: 0 };
  const acc = { wd: Array(24).fill(0), we: Array(24).fill(0) };
  for (const r of rows) {
    const s = new Date(r.start_time).getTime(), e = new Date(r.end_time).getTime();
    for (let t = s; t < e && t < s + 72 * 3600e3; t += 3600e3) { const l = local(new Date(t)); acc[l.weekend ? 'we' : 'wd'][l.hour]++; }
  }
  const norm = { wd: 40, we: 16 };   // roughly how many weekdays / weekend days are in 8 weeks
  const occ = {};
  for (const k of ['wd', 'we']) occ[k] = acc[k].map((v) => Math.min(1, v / (norm[k] * totalSlots)));
  return { n: rows.length, occ };
}

function dayForecast(f, anchor, ws, we) {
  const total = db.prepare('SELECT COUNT(*) c FROM slots WHERE facility_id=? AND is_active=1').get(f.id).c;
  const l = local(anchor);
  const dayStart = anchor.getTime() - (l.hour * 60 + l.minute) * 60000 - anchor.getUTCSeconds() * 1000 - anchor.getUTCMilliseconds();
  const key = l.weekend ? 'we' : 'wd';
  const mp = modelProf(f.id, l.ymd);
  const prof = mp || profOf(f.kind)[key];
  const hist = mp ? { n: 0 } : history(f.id, total);
  const w = hist.n ? Math.min(0.5, hist.n / 80) : 0;
  const booked = db.prepare(`SELECT slot_id, start_time, end_time FROM bookings WHERE facility_id=?
    AND status IN ('confirmed','checked_in','awaiting_payment') AND start_time < ? AND end_time > ?`)
    .all(f.id, new Date(dayStart + 864e5).toISOString(), new Date(dayStart).toISOString());
  const hours = [];
  for (let h = 0; h < 24; h++) {
    const hs = dayStart + h * 3600e3, he = hs + 3600e3;
    const a = new Date(hs).toISOString(), b = new Date(he).toISOString();
    const live = total ? new Set(booked.filter((x) => x.start_time < b && x.end_time > a).map((x) => x.slot_id)).size / total : 0;
    const p = hist.n ? (1 - w) * prof[h] + w * hist.occ[key][h] : prof[h];
    const score = Math.min(1, Math.max(live, 0.85 * p + 0.15 * live));
    const [label, cls] = levelOf(score);
    hours.push({ hour: h, score: +score.toFixed(2), level: label, cls, live: +live.toFixed(2), inWindow: hs < we && he > ws });
  }
  return { hours, w, key, prof, dayStart, model: !!mp };
}

function profileReason(avg, weekend, peakHour) {
  const when = weekend ? 'weekends' : 'weekdays';
  if (avg >= 0.6) return `Usually a busy period here on ${when} (peak around ${hourLabel(peakHour)})`;
  if (avg <= 0.3) return `Usually quiet at this time on ${when}`;
  return `Moderate demand is typical at this time on ${when}`;
}

function block(hours, from, to, pick) {
  let best = null;
  for (let h = from; h <= to - 2; h++) {
    const avg = (hours[h].score + hours[h + 1].score) / 2;
    if (!best || pick(avg, best.avg)) best = { h, avg };
  }
  if (!best) return null;
  return { from: hourLabel(best.h), to: hourLabel(best.h + 2), level: levelOf(best.avg)[0] };
}

function rushForFacility(f, start, end, opts = {}) {
  const fc = dayForecast(f, start, start.getTime(), end.getTime());
  const lh = local(start).hour;
  const use = fc.hours.filter((h) => h.inWindow);
  const sel = use.length ? use : [fc.hours[lh]];
  const avg = sel.reduce((s, h) => s + h.score, 0) / sel.length;
  const score = 0.6 * avg + 0.4 * Math.max(...sel.map((h) => h.score));
  const live = sel.reduce((s, h) => s + h.live, 0) / sel.length;
  const [label, cls] = levelOf(score);
  const peakHour = fc.prof.indexOf(Math.max(...fc.prof));
  const profAvg = sel.reduce((s, h) => s + fc.prof[h.hour], 0) / sel.length;
  const reasons = [profileReason(profAvg, fc.key === 'we', peakHour)];
  reasons.push(live > 0 ? `${Math.round(live * 100)}% of spaces are already reserved for your time` : 'No reservations yet for your time');
  if (fc.w > 0.15) reasons.push('Adjusted using this facility’s past bookings');
  if (fc.model) reasons.push('Forecast from a model trained on past visitor data and the festival / sale / holiday calendar');
  const open = parseInt(f.open_time) || 6, close = parseInt(f.close_time) || 23;
  const today = local(new Date());
  const from = local(start).ymd === today.ymd ? Math.max(open, today.hour) : open;
  const out = {
    label, cls, score: +score.toFixed(2), live: +live.toFixed(2), reasons,
    confidence: fc.model ? 'Medium - trained model (see the Rush insights page for its accuracy)' : fc.w >= 0.3 ? 'Medium - uses typical patterns plus past bookings' : 'Low - typical-pattern estimate plus current bookings (improves as bookings build up)',
    quietest: block(fc.hours, from, close, (a, b) => a < b),
    busiest: block(fc.hours, open, close, (a, b) => a > b),
  };
  if (!opts.light) out.hourly = fc.hours;
  return out;
}

// For places that are not on MARGA (e.g. parking lots found on the map): typical-pattern estimate only
function estimateArea(kind, start, end) {
  const prof = profOf(kind), l0 = local(start);
  const arr = prof[l0.weekend ? 'we' : 'wd'];
  const span = Math.max(end - start, 30 * 60000), step = Math.max(30 * 60000, span / 48);
  let sum = 0, n = 0;
  for (let t = start.getTime(); t < start.getTime() + span; t += step) {
    const l = local(new Date(t)); sum += profOf(kind)[l.weekend ? 'we' : 'wd'][l.hour]; n++;
  }
  const avg = sum / n, score = 0.85 * avg;
  const [label, cls] = levelOf(score);
  return { label, cls, score: +score.toFixed(2),
    reasons: [profileReason(avg, l0.weekend, arr.indexOf(Math.max(...arr)))],
    confidence: 'Low - typical pattern for this kind of area (no live data for this lot)' };
}

/* ---------- dynamic pricing: surge when busy, discount when quiet (optional per facility) ---------- */
function multiplierFor(f, score) {
  if (!f.dynamic_pricing) return 1;
  const surge = (f.surge_max_pct == null ? 25 : f.surge_max_pct) / 100, disc = (f.discount_max_pct == null ? 20 : f.discount_max_pct) / 100;
  const m = score < 0.30 ? 1 - disc * (0.30 - score) / 0.30 : score > 0.55 ? 1 + surge * Math.min(1, (score - 0.55) / 0.40) : 1;
  return Math.round(m * 100) / 100;
}
function pricingFor(f, start, end, rush) {
  if (!f.dynamic_pricing) return { enabled: false, multiplier: 1, label: 'Standard rate', hourly_effective: f.hourly_rate };
  const r = rush || rushForFacility(f, start, end, { light: true });
  const m = multiplierFor(f, r.score), pct = Math.round((m - 1) * 100);
  return { enabled: true, multiplier: m, label: pct > 0 ? `Busy-time price +${pct}%` : pct < 0 ? `Quiet-time discount ${pct}%` : 'Standard rate',
    hourly_effective: Math.round(f.hourly_rate * m * 100) / 100 };
}

/* ---------- forecast curve for one calendar day (24 values 0..1): trained model if available, else typical pattern + events ---------- */
function curveFor(f, ymd) {
  const ev = eventsFor(ymd), mp = modelProf(f.id, ymd);
  if (mp) return { curve: mp, source: 'model', ev };
  let c = profOf(f.kind)[(dowOf(ymd) % 6 === 0) ? 'we' : 'wd'].slice();
  const up = 1 + (ev.holiday || ev.festival ? 0.25 : 0) + (ev.sale ? 0.12 : 0) + (ev.eve ? 0.15 : 0);
  c = c.map((v) => Math.min(1, v * up));
  return { curve: c, source: 'pattern', ev };
}

module.exports = { rushForFacility, estimateArea, TZ, pricingFor, multiplierFor, curveFor, levelOf, hourLabel, local };
