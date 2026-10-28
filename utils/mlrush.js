// Rush model: ridge regression trained on hourly occupancy (0..1) using calendar features
// (hour, weekday, weekend x hour, holiday / festival / eve-of-festival / sale season / payday / long weekend).
// Training data = sample history (demo) + the facility's real bookings (real rows are weighted x3).
// The model is trained in-process (normal equations), saved in the database and used for forecasts.
const db = require('../db/database');
const { eventsFor, dowOf, addDays } = require('./events');
const TZ = process.env.TZ_NAME || 'Asia/Kolkata';

const fmtr = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', hour12: false });
function local(date) {
  const p = Object.fromEntries(fmtr.formatToParts(date).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour) % 24, minute: Number(p.minute), ymd: `${p.year}-${p.month}-${p.day}` };
}
function midnightUTC(ymd) {                      // UTC instant of 00:00 local time on that date
  const [y, m, d] = ymd.split('-').map(Number);
  let g = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 3; i++) { const l = local(new Date(g)); const diff = (l.hour * 60 + l.minute) * 60000; g -= diff; if (local(new Date(g)).ymd === ymd) break; g += l.ymd > ymd ? -864e5 : l.ymd < ymd ? 864e5 : 0; }
  return g;
}
const NF = 64;
function vec(hour, ymd) {
  const ev = eventsFor(ymd), dow = ev.dow, weekend = dow === 0 || dow === 6;
  const x = new Array(NF).fill(0);
  x[0] = 1; x[1 + hour] = 1; x[25 + dow] = 1; if (weekend) x[32 + hour] = 1;
  x[56] = ev.holiday ? 1 : 0; x[57] = ev.festival ? 1 : 0; x[58] = ev.eve ? 1 : 0; x[59] = ev.sale ? 1 : 0; x[60] = ev.payday ? 1 : 0; x[61] = ev.long ? 1 : 0;
  const evening = hour >= 17 && hour <= 21;
  x[62] = (ev.holiday || ev.festival) && evening ? 1 : 0; x[63] = ev.sale && weekend ? 1 : 0;
  return x;
}
function solve(A, b) {                                // Gaussian elimination with partial pivoting
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / d; if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / (M[r][r] || 1e-12); }
  return x;
}
function fit(rows, lambda = 1.0) {
  const A = Array.from({ length: NF }, () => new Array(NF).fill(0)), b = new Array(NF).fill(0);
  for (const r of rows) for (let i = 0; i < NF; i++) { if (!r.x[i]) continue; b[i] += r.w * r.y * r.x[i]; for (let j = 0; j < NF; j++) if (r.x[j]) A[i][j] += r.w * r.x[i] * r.x[j]; }
  for (let i = 1; i < NF; i++) A[i][i] += lambda;     // intercept is not penalised
  return solve(A, b);
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const clamp = (v) => Math.max(0, Math.min(1, v));

function rowsFor(fid) {
  const rows = [];
  const total = db.prepare('SELECT COUNT(*) c FROM slots WHERE facility_id=? AND is_active=1').get(fid).c;
  let nReal = 0;
  if (total) {
    const bks = db.prepare("SELECT slot_id, start_time, end_time FROM bookings WHERE facility_id=? AND status IN ('completed','checked_in','awaiting_payment')").all(fid);
    const byHour = new Map();
    for (const b of bks) {
      const s = new Date(b.start_time).getTime(), e = new Date(b.end_time).getTime();
      for (let t = Math.floor(s / 3600e3) * 3600e3; t < e && t < s + 72 * 3600e3; t += 3600e3) {
        const k = new Date(t).toISOString(); if (!byHour.has(k)) byHour.set(k, new Set()); byHour.get(k).add(b.slot_id);
      }
    }
    for (const [ts, set] of byHour) { const l = local(new Date(ts)); rows.push({ ts, x: vec(l.hour, l.ymd), y: Math.min(1, set.size / total), w: 3, real: true }); nReal++; }
  }
  // sample (demo) history is phased out as real bookings build up: full weight at 0 real hours, none from 200 real hours on
  const sw = Math.max(0, 1 - nReal / 200);
  if (sw > 0) db.prepare("SELECT ts, occupancy FROM rush_history WHERE facility_id=? ORDER BY ts").all(fid)
    .forEach((r) => { const l = local(new Date(r.ts)); rows.push({ ts: r.ts, x: vec(l.hour, l.ymd), y: r.occupancy, w: sw, real: false }); });
  rows.sort((a, b) => (a.ts < b.ts ? -1 : 1));
  return { rows, nReal };
}
function train(fid) {
  const { rows, nReal } = rowsFor(fid);
  if (rows.length < 200) return { trained: false, reason: `Not enough history yet (${rows.length} hourly samples, need 200).` };
  const cut = Math.floor(rows.length * 0.8);
  const m1 = fit(rows.slice(0, cut)), test = rows.slice(cut);
  const mean = test.reduce((s, r) => s + r.y, 0) / test.length;
  let ae = 0, ss = 0, st = 0;
  for (const r of test) { const p = clamp(dot(m1, r.x)); ae += Math.abs(p - r.y); ss += (r.y - p) ** 2; st += (r.y - mean) ** 2; }
  const coef = fit(rows);
  const mae = ae / test.length, r2 = st ? 1 - ss / st : 0;
  db.prepare(`INSERT OR REPLACE INTO rush_models(facility_id,trained_at,n_samples,n_real,mae,r2,coef,note) VALUES(?,?,?,?,?,?,?,?)`)
    .run(fid, new Date().toISOString(), rows.length, nReal, +mae.toFixed(4), +r2.toFixed(4), JSON.stringify(coef.map((v) => +v.toFixed(5))),
      nReal >= 200 ? 'Trained on real bookings only' : nReal ? `Trained on real bookings (${nReal} hours) plus sample history, which fades out as real data grows` : 'Trained on sample (demo) history only');
  cache.delete(fid);
  return { trained: true, n_samples: rows.length, n_real: nReal, mae, r2 };
}
const cache = new Map();
function getModel(fid) {
  const r = db.prepare('SELECT * FROM rush_models WHERE facility_id=?').get(fid);
  if (!r) return null;
  const c = cache.get(fid); if (c && c.trained_at === r.trained_at) return c;
  const m = { ...r, coef: JSON.parse(r.coef) }; cache.set(fid, m); return m;
}
function predictDay(fid, ymd) {
  const m = getModel(fid); if (!m) return null;
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, pred: +clamp(dot(m.coef, vec(h, ymd))).toFixed(3) }));
}

/* ---------- sample (demo) history for a big mall: visitors by hour, with festival / sale / payday effects ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mallBase(h, weekend) {
  const g = (c, w, a) => a * Math.exp(-((h - c) ** 2) / (2 * w * w));
  let v = weekend ? 0.22 + g(13, 2.2, 0.38) + g(18.5, 2.4, 0.55) : 0.14 + g(13, 2.0, 0.30) + g(19, 2.0, 0.40);
  if (h < 10 || h >= 23) v *= 0.08; else if (h >= 22) v *= 0.55;
  return v;
}
function generateSample(fid, days = 150, seed = 7) {
  const rand = rng(seed + fid), gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const today = local(new Date()).ymd;
  const ins = db.prepare('INSERT OR REPLACE INTO rush_history(facility_id,ts,occupancy,source) VALUES(?,?,?,?)');
  db.transaction(() => {
    for (let d = days; d >= 1; d--) {
      const ymd = addDays(today, -d), ev = eventsFor(ymd), dow = ev.dow, weekend = dow === 0 || dow === 6, mid = midnightUTC(ymd);
      for (let h = 0; h < 24; h++) {
        let v = mallBase(h, weekend) * (1 + (ev.holiday ? 0.4 : 0) + (ev.festival ? 0.3 : 0) + (ev.eve ? 0.28 : 0) + (ev.sale ? 0.25 : 0) + (ev.payday ? 0.1 : 0) + (ev.long ? 0.2 : 0));
        if (dow === 5 && h >= 17 && h <= 21) v += 0.1;
        v = clamp(v + gauss() * 0.045); if (h < 10 || h >= 23) v = Math.min(v, 0.06);
        ins.run(fid, new Date(mid + h * 3600e3).toISOString(), +v.toFixed(3), 'sample');
      }
    }
  })();
}
module.exports = { train, getModel, predictDay, generateSample, local, midnightUTC };
