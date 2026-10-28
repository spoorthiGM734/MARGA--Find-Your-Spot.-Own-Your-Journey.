// Geometry-based digital layout generator.
// Pattern along the site length: slots | aisle | slots  slots | aisle | slots ...
// (rows back-to-back, every row faces a driving aisle). Operators can review/move/remove afterwards.
const VEHICLES = {
  car: { w: 2.5, d: 5.0 },
  suv: { w: 2.7, d: 5.5 },
  bike: { w: 1.0, d: 2.0 },
};
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function generateLayout({ width, length, vehicle = 'car', aisle = 6, margin = 1, obstacles = [], maxSlots = 0, startNumber = 1 }) {
  const v = VEHICLES[vehicle];
  if (!v) throw new Error('Unknown vehicle type');
  width = Number(width); length = Number(length);
  if (!(width >= 5 && length >= 5)) throw new Error('Site width and length must be at least 5 m');
  aisle = Math.max(Number(aisle) || 6, vehicle === 'bike' ? 3 : 5.5); // minimum manoeuvring aisle
  const cols = Math.floor((width - 2 * margin) / v.w);
  if (cols < 1 || length - 2 * margin < v.d) throw new Error('Site is too small for this vehicle type');

  const limit = maxSlots > 0 ? maxSlots : Infinity;
  const pattern = ['S', 'A', 'S'];
  const slots = [];
  let y = margin, i = 0, n = Number(startNumber) || 1;

  while (slots.length < limit) {
    const t = pattern[i % 3];
    const h = t === 'S' ? v.d : aisle;
    if (y + h > length - margin + 1e-9) break;
    if (t === 'S') {
      for (let c = 0; c < cols && slots.length < limit; c++) {
        const r = { x: +(margin + c * v.w).toFixed(2), y: +y.toFixed(2), w: v.w, h: v.d };
        if (obstacles.some((o) => hit(r, o))) continue; // skip spaces blocked by pillars, trees, etc.
        slots.push({ ...r, label: 'Slot ' + n++, vehicle_type: vehicle });
      }
    }
    y += h; i++;
  }
  if (!slots.length) throw new Error('No valid parking spaces fit in this site');
  return slots;
}

/* ===================================================================================================
   Convenience-aware generator (v2): the operator marks the ENTRY and EXIT gates; the generator
   - reserves driving lanes so every aisle connects the entry to the exit,
   - lays rows out in a frame where the entry is at the bottom, then rotates the result to the real site,
   - numbers slots by convenience (closest to the gates first),
   - puts accessible slots and EV-charging slots closest to the gates and marks covered slots / height limits.
   (Rule-based optimisation - not machine learning.)
   =================================================================================================== */
const SIDES = ['bottom', 'top', 'left', 'right'];
const clamp01 = (v) => Math.min(1, Math.max(0, Number(v)));
function gateXY(side, pos, W, L) {
  pos = clamp01(pos);
  return side === 'top' ? { x: pos * W, y: 0 } : side === 'left' ? { x: 0, y: pos * L } : side === 'right' ? { x: W, y: pos * L } : { x: pos * W, y: L };
}
const toFrame = (side, W, L, p) => (side === 'top' ? { x: W - p.x, y: L - p.y } : side === 'left' ? { x: p.y, y: W - p.x } : side === 'right' ? { x: p.y, y: p.x } : { x: p.x, y: p.y });
function rectToReal(side, Wf, Lf, r) {
  if (side === 'top') return { x: Wf - (r.x + r.w), y: Lf - (r.y + r.h), w: r.w, h: r.h };
  if (side === 'left') return { x: Lf - (r.y + r.h), y: r.x, w: r.h, h: r.w };
  if (side === 'right') return { x: r.y, y: r.x, w: r.h, h: r.w };
  return { ...r };
}
function rectToFrame(side, W, L, r) {
  const a = toFrame(side, W, L, { x: r.x, y: r.y }), b = toFrame(side, W, L, { x: r.x + r.w, y: r.y + r.h });
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}
function generateLayoutV2(o) {
  const vehicle = o.vehicle || 'car', v = VEHICLES[vehicle];
  if (!v) throw new Error('Unknown vehicle type');
  const W = Number(o.width), L = Number(o.length);
  if (!(W >= 12 && L >= 12)) throw new Error('The site must be at least 12 m x 12 m to fit driving lanes and slots');
  const entry = { side: SIDES.includes(o.entry && o.entry.side) ? o.entry.side : 'bottom', pos: clamp01(o.entry && o.entry.pos != null ? o.entry.pos : 0.5) };
  const exit = o.exit && SIDES.includes(o.exit.side) ? { side: o.exit.side, pos: clamp01(o.exit.pos != null ? o.exit.pos : 0.5) } : { ...entry };
  const side = entry.side, Wf = (side === 'left' || side === 'right') ? L : W, Lf = (side === 'left' || side === 'right') ? W : L;
  const eReal = gateXY(entry.side, entry.pos, W, L), xReal = gateXY(exit.side, exit.pos, W, L);
  const eF = toFrame(side, W, L, eReal), xF = toFrame(side, W, L, xReal);
  const exitSide = xF.y <= 0.01 ? 'top' : xF.x >= Wf - 0.01 ? 'right' : xF.x <= 0.01 ? 'left' : 'bottom';
  const aisle = Math.max(Number(o.aisle) || 6, vehicle === 'bike' ? 3 : 5.5), lane = 3.5;
  const x0 = 1 + lane, x1 = Wf - (exitSide === 'right' ? 1 + lane : 1), y0 = exitSide === 'top' ? 1 + lane : 1, y1 = Lf - Math.max(aisle, 5.5);
  if (x1 - x0 < v.w || y1 - y0 < v.d) throw new Error('The site is too small for driving lanes plus this vehicle type - increase the size');
  const obs = (Array.isArray(o.obstacles) ? o.obstacles : []).map((ob) => rectToFrame(side, W, L, ob));
  const cols = Math.floor((x1 - x0) / v.w), cand = [], pattern = ['S', 'A', 'S'];
  let y = y0, i = 0;
  while (true) {
    const t = pattern[i % 3], h = t === 'S' ? v.d : aisle;
    if (y + h > y1 + 1e-9) break;
    if (t === 'S') for (let c = 0; c < cols; c++) {
      const r = { x: +(x0 + c * v.w).toFixed(2), y: +y.toFixed(2), w: v.w, h: v.d };
      if (!obs.some((q) => hit(r, q))) cand.push(r);
    }
    y += h; i++;
  }
  if (!cand.length) throw new Error('No valid parking spaces fit in this site');
  const sameGate = exit.side === entry.side && Math.abs(exit.pos - entry.pos) < 0.02;
  cand.forEach((r) => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const dE = Math.abs(cx - eF.x) + Math.abs(eF.y - cy), dX = sameGate ? dE : Math.abs(cx - xF.x) + Math.abs(cy - xF.y);
    r.score = 0.7 * dE + 0.3 * dX; r.dE = dE;
  });
  cand.sort((a, b) => a.score - b.score || b.y - a.y || a.x - b.x);
  const max = Math.max(0, parseInt(o.maxSlots) || 0), chosen = max > 0 ? cand.slice(0, max) : cand, n = chosen.length;
  const nA = o.accessible != null && o.accessible !== '' ? Math.min(n, Math.max(0, parseInt(o.accessible))) : (n >= 8 ? Math.max(1, Math.round(n * 0.05)) : 0);
  const nE = o.ev != null && o.ev !== '' ? Math.min(n - nA, Math.max(0, parseInt(o.ev))) : (n >= 10 ? Math.max(1, Math.round(n * 0.08)) : 0);
  const cov = ['all', 'none', 'half'].includes(o.covered) ? o.covered : 'none';
  const height = o.height ? Number(o.height) : null;
  let num = Number(o.startNumber) || 1;
  const slots = chosen.map((r, k) => {
    const real = rectToReal(side, Wf, Lf, r), covered = cov === 'all' || (cov === 'half' && k < Math.ceil(n / 2));
    return { x: +real.x.toFixed(2), y: +real.y.toFixed(2), w: +real.w.toFixed(2), h: +real.h.toFixed(2), label: 'Slot ' + num++, vehicle_type: vehicle,
      accessible: k < nA ? 1 : 0, ev: k >= nA && k < nA + nE ? 1 : 0, covered: covered ? 1 : 0, max_height: covered && height > 0 ? height : null };
  });
  return { slots, meta: { entry: { ...entry, ...eReal }, exit: { ...exit, ...xReal }, counts: { total: n, accessible: nA, ev: nE, covered: slots.filter((s) => s.covered).length } } };
}

module.exports = { generateLayout, generateLayoutV2, gateXY, VEHICLES };
