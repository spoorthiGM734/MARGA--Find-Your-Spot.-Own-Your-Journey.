const router = require('express').Router();
const db = require('../db/database');
const { fail } = require('../utils/http');
const { calcFee } = require('../utils/pricing');
const { slotStates, compatible, expireStale } = require('../services/booking');
const { rushForFacility, estimateArea, pricingFor, multiplierFor, curveFor, levelOf, local } = require('../utils/rush');
const ml = require('../utils/mlrush');
const { listEvents, addDays } = require('../utils/events');

function windowFrom(req) {
  const start = req.query.start ? new Date(req.query.start) : new Date();
  const end = req.query.end ? new Date(req.query.end) : new Date(start.getTime() + 2 * 3600e3);
  if (isNaN(start) || isNaN(end) || end <= start) fail(400, 'Invalid time window');
  return { start, end };
}

const haversine = (a, b, c, d) => {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (c - a) * rad, dLng = (d - b) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/* Destination-centred search with explainable ranking */
router.get('/search', (req, res) => {
  expireStale();
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
  if (!isFinite(lat) || !isFinite(lng)) fail(400, 'Destination coordinates are required');
  const radius = Math.min(Math.max(parseFloat(req.query.radius) || 1, 0.2), 10);
  const start = req.query.start ? new Date(req.query.start) : new Date();
  const end = req.query.end ? new Date(req.query.end) : new Date(start.getTime() + 2 * 3600e3);
  if (isNaN(start) || isNaN(end) || end <= start) fail(400, 'Invalid time window');
  const vehicle = ['car', 'suv', 'bike'].includes(req.query.vehicle) ? req.query.vehicle : 'car';
  const pref = ['cheapest', 'closest', 'balanced'].includes(req.query.pref) ? req.query.pref : 'balanced';
  const want = String(req.query.features || '').split(',').filter((x) => ['ev', 'covered', 'accessible'].includes(x));

  const rows = db.prepare(`
    SELECT f.id,f.name,f.address,f.lat,f.lng,f.kind,f.open_time,f.close_time,f.vehicle_types,
           t.hourly_rate,t.min_charge,t.grace_minutes,t.daily_cap, f.dynamic_pricing, f.surge_max_pct, f.discount_max_pct, f.height_limit_m,
           (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.facility_id=f.id) rating_avg, (SELECT COUNT(*) FROM reviews r WHERE r.facility_id=f.id) rating_count,
           (SELECT COUNT(*) FROM slots s WHERE s.facility_id=f.id AND s.is_active=1 AND s.ev=1) ev_count,
           (SELECT COUNT(*) FROM slots s WHERE s.facility_id=f.id AND s.is_active=1 AND s.covered=1) covered_count,
           (SELECT COUNT(*) FROM slots s WHERE s.facility_id=f.id AND s.is_active=1 AND s.accessible=1) accessible_count
    FROM facilities f JOIN tariffs t ON t.facility_id=f.id
    WHERE f.verification_status='approved' AND f.layout_status='published'`).all();

  const mins = Math.ceil((end - start) / 60000);
  let list = rows.map((f) => ({ ...f, distance_km: haversine(lat, lng, f.lat, f.lng) }))
    .filter((f) => f.distance_km <= radius)
    .map((f) => {
      const states = slotStates(f.id, start.toISOString(), end.toISOString());
      const fit = states.filter((s) => s.state !== 'blocked' && compatible(vehicle, s.vehicle_type) && want.every((k) => s[k]));
      const rush = rushForFacility(f, start, end, { light: true }), pricing = pricingFor(f, start, end, rush);
      return {
        ...f,
        total: fit.length,
        available: fit.filter((s) => s.state === 'available').length,
        walk_min: Math.max(1, Math.round((f.distance_km * 1.3 / 5) * 60)),
        est_cost: Math.round(calcFee(mins, f) * pricing.multiplier),
        rush, pricing,
      };
    });

  if (want.length) list = list.filter((f) => f.total > 0);
  if (!list.length) return res.json({ results: [], radius });

  const rates = list.map((f) => f.hourly_rate), dists = list.map((f) => f.distance_km);
  const minR = Math.min(...rates), maxR = Math.max(...rates), minD = Math.min(...dists);
  const W = { cheapest: [0.6, 0.2, 0.2], closest: [0.2, 0.6, 0.2], balanced: [0.35, 0.35, 0.3] }[pref];

  list.forEach((f) => {
    const p = maxR === minR ? 1 : 1 - (f.hourly_rate - minR) / (maxR - minR);
    const d = 1 - f.distance_km / radius;
    const a = f.total ? Math.min(1, f.available / Math.min(f.total, 5)) : 0;
    f.score = +((W[0] * p + W[1] * d + W[2] * a) * (f.available ? 1 : 0.1)).toFixed(3);
    f.reasons = [];
    if (f.available) {
      if (list.length > 1 && f.hourly_rate === minR) f.reasons.push(`Lowest hourly rate in range (Rs ${f.hourly_rate}/hr)`);
      else f.reasons.push(`Rs ${f.hourly_rate}/hr`);
    }
    if (list.length > 1 && f.distance_km === minD) f.reasons.push('Closest to your destination');
    f.reasons.push(`About ${f.walk_min} min walk (${Math.round(f.distance_km * 1000)} m straight-line)`);
    f.reasons.push(`${f.available} of ${f.total} compatible spaces free for your time`);
    f.reasons.push(`Expected rush at your time: ${f.rush.label} - ${f.rush.reasons[0].charAt(0).toLowerCase() + f.rush.reasons[0].slice(1)}`);
    if (f.available > 0 && f.available <= 2) f.reasons.push('Filling up - only a few spaces left');
    if (!f.available) f.reasons.push('Fully reserved for this time - see the alternatives');
  });

  list.sort((a, b) => (!!b.available - !!a.available) || b.score - a.score);
  res.json({
    results: list, radius,
    note: 'Walking distance is a straight-line estimate. Availability is the operator-reported inventory managed by Marga.',
  });
});

function publicFacility(id) {
  const f = db.prepare(`SELECT f.*, t.hourly_rate,t.min_charge,t.grace_minutes,t.daily_cap,
    (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.facility_id=f.id) rating_avg, (SELECT COUNT(*) FROM reviews r WHERE r.facility_id=f.id) rating_count
    FROM facilities f JOIN tariffs t ON t.facility_id=f.id WHERE f.id=?`).get(id);
  if (!f || f.verification_status !== 'approved' || f.layout_status !== 'published') fail(404, 'Facility not found');
  delete f.authority_note; delete f.review_note;
  return f;
}

// All bookable facilities (used by the rush-insights page picker)
router.get('/list/all', (req, res) => {
  res.json(db.prepare(`SELECT f.id, f.name, f.address, f.kind, EXISTS(SELECT 1 FROM rush_models m WHERE m.facility_id=f.id) has_model
    FROM facilities f WHERE f.verification_status='approved' AND f.layout_status='published' ORDER BY has_model DESC, f.name`).all());
});

// Rush estimate for a place that is not on MARGA (e.g. a parking lot found on the map): typical pattern only
router.get('/rush/estimate', (req, res) => {
  const { start, end } = windowFrom(req);
  const kind = ['mall', 'garage', 'open_ground', 'street', 'other'].includes(req.query.kind) ? req.query.kind : 'other';
  res.json(estimateArea(kind, start, end));
});

router.get('/:id', (req, res) => res.json(publicFacility(req.params.id)));

// Expected rush for a facility: level for the chosen time + hourly forecast for that day
router.get('/:id/rush', (req, res) => {
  const f = publicFacility(req.params.id);
  const { start, end } = windowFrom(req);
  const r = rushForFacility(f, start, end);
  r.pricing = pricingFor(f, start, end, r);
  res.json(r);
});

router.get('/:id/slots', (req, res) => {
  const f = publicFacility(req.params.id);
  const start = req.query.start ? new Date(req.query.start) : new Date();
  const end = req.query.end ? new Date(req.query.end) : new Date(start.getTime() + 2 * 3600e3);
  if (isNaN(start) || isNaN(end) || end <= start) fail(400, 'Invalid time window');
  res.json({
    facility: { id: f.id, name: f.name, width_m: f.width_m, length_m: f.length_m, layout_v: f.layout_v, entry_side: f.entry_side, entry_pos: f.entry_pos, exit_side: f.exit_side, exit_pos: f.exit_pos, height_limit_m: f.height_limit_m },
    slots: slotStates(f.id, start.toISOString(), end.toISOString()),
  });
});

/* ---------- rush insights: calendar, day curve, weekly pattern, model info ---------- */
const pad = (n) => String(n).padStart(2, '0');
const openRange = (f) => [parseInt(f.open_time) || 6, Math.min(24, (parseInt(f.close_time) || 23) + 1)];
function twoHour(curve, from, to, pickMax) {
  let best = null;
  for (let h = from; h <= to - 2; h++) { const a = (curve[h] + curve[h + 1]) / 2; if (!best || (pickMax ? a > best.a : a < best.a)) best = { h, a }; }
  return best ? { from: best.h, to: best.h + 2, pct: Math.round(best.a * 100), level: levelOf(best.a)[0] } : null;
}
router.get('/:id/rush/calendar', (req, res) => {
  const f = publicFacility(req.params.id), today = local(new Date()).ymd;
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : today.slice(0, 7);
  const [y, m] = month.split('-').map(Number), dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), [h0, h1] = openRange(f);
  const days = []; let source = 'pattern';
  for (let d = 1; d <= dim; d++) {
    const ymd = `${month}-${pad(d)}`, { curve, source: src, ev } = curveFor(f, ymd); source = src;
    const sl = curve.slice(h0, h1), peak = Math.max(...sl), [label, cls] = levelOf(peak);
    days.push({ date: ymd, dow: ev.dow, peak: +peak.toFixed(2), peak_hour: h0 + sl.indexOf(peak), avg: +(sl.reduce((a, v) => a + v, 0) / sl.length).toFixed(2), level: label, cls, events: ev.names, past: ymd < today });
  }
  res.json({ month, today, source, days, upcoming: listEvents(today, 45), open: [h0, h1] });
});
router.get('/:id/rush/day', (req, res) => {
  const f = publicFacility(req.params.id), today = local(new Date()).ymd;
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : today;
  const { curve, source, ev } = curveFor(f, ymd), [h0, h1] = openRange(f);
  const hours = curve.map((v, h) => { const [level, cls] = levelOf(v), mult = multiplierFor(f, v); return { hour: h, pct: Math.round(v * 100), level, cls, multiplier: mult, price: Math.round(f.hourly_rate * mult * 100) / 100 }; });
  res.json({ date: ymd, source, events: ev.names, hours, open: [h0, h1], dynamic: !!f.dynamic_pricing, base_rate: f.hourly_rate,
    busiest: twoHour(curve, h0, h1, true), quietest: twoHour(curve, h0, h1, false), today });
});
router.get('/:id/rush/weekly', (req, res) => {
  const f = publicFacility(req.params.id), today = local(new Date()).ymd, [h0, h1] = openRange(f);
  const sum = Array.from({ length: 7 }, () => new Array(24).fill(0)), n = new Array(7).fill(0);
  for (let i = 0; i < 56; i++) {
    const ymd = addDays(today, i), { curve, ev } = curveFor(f, ymd);
    if (ev.holiday || ev.festival || ev.eve || ev.sale) continue;           // ordinary weeks only
    curve.forEach((v, h) => { sum[ev.dow][h] += v; }); n[ev.dow]++;
  }
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  res.json({ open: [h0, h1], days: [1, 2, 3, 4, 5, 6, 0].map((d) => ({ dow: d, name: names[d], pct: sum[d].map((v) => Math.round((n[d] ? v / n[d] : 0) * 100)) })) });
});
router.get('/:id/rush/model', (req, res) => {
  const f = publicFacility(req.params.id), m = ml.getModel(f.id);
  res.json(m ? { has_model: true, trained_at: m.trained_at, n_samples: m.n_samples, n_real: m.n_real, mae_pct: Math.round(m.mae * 1000) / 10, r2: m.r2, features: m.coef.length, note: m.note }
    : { has_model: false, note: 'No trained model yet - the forecast uses typical patterns for this kind of place.' });
});

module.exports = router;
