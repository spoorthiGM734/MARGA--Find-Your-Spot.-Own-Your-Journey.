/* In-facility drive guide: finds a driving path through the free lanes of the published layout
   (entry gate -> your slot, and your slot -> exit gate), and turns it into spoken / written steps.
   Works for any layout and any gate position the operator has marked. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Guide = factory(); })(this, function () {
  const CELL = 0.5, DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // N E S W (screen coordinates: y grows downward)

  function gateXY(side, pos, W, L) {
    pos = Math.min(1, Math.max(0, Number(pos)));
    return side === 'top' ? { x: pos * W, y: 0 } : side === 'left' ? { x: 0, y: pos * L } : side === 'right' ? { x: W, y: pos * L } : { x: pos * W, y: L };
  }
  const inward = (side) => (side === 'top' ? 2 : side === 'left' ? 1 : side === 'right' ? 3 : 0);   // direction index when driving in

  /* ---------- grid + distance-to-obstacle (so the path stays in the middle of lanes) ---------- */
  function makeGrid(W, L, slots, allowId) {
    const nx = Math.ceil(W / CELL), ny = Math.ceil(L / CELL), N = nx * ny, blocked = new Uint8Array(N);
    for (const s of slots) {
      if (s.id === allowId || s.is_active === 0) continue;
      const i0 = Math.max(0, Math.ceil(s.x / CELL - 0.5)), i1 = Math.min(nx - 1, Math.ceil((s.x + s.w) / CELL - 0.5) - 1);
      const j0 = Math.max(0, Math.ceil(s.y / CELL - 0.5)), j1 = Math.min(ny - 1, Math.ceil((s.y + s.h) / CELL - 0.5) - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) blocked[j * nx + i] = 1;
    }
    const dist = new Float32Array(N);
    for (let i = 0; i < N; i++) dist[i] = blocked[i] ? 0 : 1e9;
    const get = (x, y) => (x < 0 || y < 0 || x >= nx || y >= ny ? 0 : dist[y * nx + x]);
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const k = y * nx + x; let d = dist[k];
      d = Math.min(d, get(x - 1, y) + 1, get(x, y - 1) + 1, get(x - 1, y - 1) + 1.414, get(x + 1, y - 1) + 1.414); dist[k] = d;
    }
    for (let y = ny - 1; y >= 0; y--) for (let x = nx - 1; x >= 0; x--) {
      const k = y * nx + x; let d = dist[k];
      d = Math.min(d, get(x + 1, y) + 1, get(x, y + 1) + 1, get(x + 1, y + 1) + 1.414, get(x - 1, y + 1) + 1.414); dist[k] = d;
    }
    return { nx, ny, N, blocked, dist };
  }

  /* ---------- A* with a small turn penalty (fewer, cleaner turns) ---------- */
  function heapPush(h, f, v) { h.f.push(f); h.v.push(v); let i = h.f.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h.f[p] <= h.f[i]) break; [h.f[p], h.f[i]] = [h.f[i], h.f[p]]; [h.v[p], h.v[i]] = [h.v[i], h.v[p]]; i = p; } }
  function heapPop(h) {
    const top = h.v[0], lf = h.f.pop(), lv = h.v.pop();
    if (h.f.length) { h.f[0] = lf; h.v[0] = lv; let i = 0, n = h.f.length;
      for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < n && h.f[l] < h.f[m]) m = l; if (r < n && h.f[r] < h.f[m]) m = r; if (m === i) break; [h.f[m], h.f[i]] = [h.f[i], h.f[m]]; [h.v[m], h.v[i]] = [h.v[i], h.v[m]]; i = m; } }
    return top;
  }
  function findCells(grid, start, goal, startDir, inflate) {
    const { nx, ny, N, blocked, dist } = grid;
    const near = (k, c) => Math.abs((k % nx) - (c % nx)) + Math.abs(((k / nx) | 0) - ((c / nx) | 0)) <= 4;
    const pass = (k) => !blocked[k] && (dist[k] * CELL >= inflate || near(k, start) || near(k, goal));
    const g = new Float32Array(N * 4).fill(Infinity), par = new Int32Array(N * 4).fill(-1), heap = { f: [], v: [] };
    const gx = goal % nx, gy = (goal / nx) | 0;
    const hf = (k) => (Math.abs((k % nx) - gx) + Math.abs(((k / nx) | 0) - gy)) * CELL;
    const starts = startDir == null ? [0, 1, 2, 3] : [startDir];
    for (const d of starts) { g[start * 4 + d] = 0; heapPush(heap, hf(start), start * 4 + d); }
    let end = -1;
    while (heap.f.length) {
      const st = heapPop(heap), k = st >> 2, d = st & 3;
      if (k === goal) { end = st; break; }
      const cur = g[st];
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3)) continue;
        const x = (k % nx) + DIRS[nd][0], y = ((k / nx) | 0) + DIRS[nd][1];
        if (x < 0 || y < 0 || x >= nx || y >= ny) continue;
        const nk = y * nx + x; if (!pass(nk)) continue;
        const dm = dist[nk] * CELL, cost = CELL * (1 + Math.max(0, (2 - dm) / 2) * 1.5) + (nd !== d ? 2 : 0);
        const ns = nk * 4 + nd;
        if (cur + cost < g[ns]) { g[ns] = cur + cost; par[ns] = st; heapPush(heap, cur + cost + hf(nk), ns); }
      }
    }
    if (end < 0) return null;
    const cells = []; for (let s = end; s !== -1; s = par[s]) { const k = s >> 2; if (!cells.length || cells[cells.length - 1] !== k) cells.push(k); }
    return cells.reverse();
  }
  function simplify(pts) {
    const out = [];
    for (const p of pts) {
      if (out.length && Math.abs(out[out.length - 1].x - p.x) < 1e-6 && Math.abs(out[out.length - 1].y - p.y) < 1e-6) continue;
      if (out.length >= 2) { const a = out[out.length - 2], b = out[out.length - 1]; if ((Math.abs(a.x - b.x) < 1e-6 && Math.abs(b.x - p.x) < 1e-6) || (Math.abs(a.y - b.y) < 1e-6 && Math.abs(b.y - p.y) < 1e-6)) out.pop(); }
      out.push(p);
    }
    return out;
  }

  /* ---------- route + steps ---------- */
  function buildRoute(fac, slots, targetId, mode) {
    mode = mode || 'in';
    const W = fac.width_m, L = fac.length_m, t = slots.find((s) => s.id === targetId);
    if (!t || !W || !L) return null;
    const eSide = fac.entry_side || 'bottom', ePos = fac.entry_pos == null ? 0.5 : fac.entry_pos;
    const xSide = fac.exit_side || eSide, xPos = fac.exit_side ? (fac.exit_pos == null ? 0.5 : fac.exit_pos) : ePos;
    const entry = gateXY(eSide, ePos, W, L), exit = gateXY(xSide, xPos, W, L), slotC = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
    const from = mode === 'in' ? entry : slotC, to = mode === 'in' ? slotC : exit;
    const cellOf = (p) => Math.min(grid_ny - 1, Math.max(0, Math.floor(p.y / CELL))) * grid_nx + Math.min(grid_nx - 1, Math.max(0, Math.floor(p.x / CELL)));
    let grid_nx = 0, grid_ny = 0, cells = null, grid = null;
    for (const inflate of [0.9, 0.6, 0.3, 0]) {
      grid = makeGrid(W, L, slots, t.id); grid_nx = grid.nx; grid_ny = grid.ny;
      cells = findCells(grid, cellOf(from), cellOf(to), mode === 'in' ? inward(eSide) : null, inflate);
      if (cells) break;
    }
    let pts, approx = false;
    if (cells) {
      pts = cells.map((k) => ({ x: ((k % grid.nx) + 0.5) * CELL, y: (((k / grid.nx) | 0) + 0.5) * CELL }));
      const edge = (p, side) => (side === 'top' ? { x: p.x, y: 0 } : side === 'left' ? { x: 0, y: p.y } : side === 'right' ? { x: W, y: p.y } : { x: p.x, y: L });
      if (mode === 'in') pts.unshift(edge(pts[0], eSide)); else pts.push(edge(pts[pts.length - 1], xSide));
      pts = simplify(pts);
    } else { approx = true; pts = simplify([from, { x: to.x, y: from.y }, to]); }
    const heading0 = mode === 'in' ? inward(eSide) : null;
    const segs = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y); if (len < 1e-6) continue;
      const dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
      segs.push({ a, b, len, dir: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0) });
    }
    let prev = heading0 == null ? (segs[0] ? segs[0].dir : 0) : heading0, total = 0;
    const steps = [], n = segs.length;
    segs.forEach((s, i) => {
      const diff = (s.dir - prev + 4) & 3, turn = diff === 0 ? 'straight' : diff === 1 ? 'right' : diff === 3 ? 'left' : 'uturn';
      const last = i === n - 1;
      let kind;
      if (mode === 'in') kind = last ? (n === 1 ? 'start_slot' : 'slot') : i === 0 ? 'start' : turn === 'straight' ? 'straight' : 'turn';
      else kind = i === 0 ? 'exit_start' : turn === 'straight' ? 'straight' : 'turn';
      steps.push({ kind, turn, len: s.len, from: s.a, to: s.b, start: total, arrive: false });
      total += s.len; prev = s.dir;
    });
    if (mode === 'in' && n > 1) { const lastTurn = steps[n - 1].turn; if (steps[n - 2]) steps[n - 2].near = lastTurn === 'left' || lastTurn === 'right' ? lastTurn : null; }
    steps.push({ kind: mode === 'in' ? 'arrive' : 'exit_arrive', turn: 'straight', len: 0, from: pts[pts.length - 1], to: pts[pts.length - 1], start: total, arrive: true });
    return { mode, points: pts, steps, total, approx, entry, exit, slotC };
  }
  function pointAt(route, s) {
    s = Math.max(0, Math.min(route.total, s));
    for (const st of route.steps) {
      if (st.arrive) break;
      if (s <= st.start + st.len + 1e-9) { const f = st.len ? (s - st.start) / st.len : 0; return { x: st.from.x + (st.to.x - st.from.x) * f, y: st.from.y + (st.to.y - st.from.y) * f }; }
    }
    return route.points[route.points.length - 1];
  }

  /* ---------- wording (English / Hindi / Kannada) ---------- */
  const T = {
    en: { unit: 'metres', by: 'by', slotWord: 'Slot', left: 'left', right: 'right',
      start: 'Enter through the gate and drive straight for {m} metres.', turn_left: 'Turn left and drive {m} metres.', turn_right: 'Turn right and drive {m} metres.',
      uturn: 'Make a U-turn and drive {m} metres.', straight: 'Continue straight for {m} metres.', near_left: ' {label} will be on your left.', near_right: ' {label} will be on your right.',
      slot_left: 'Turn left into {label}. It is {size}. Your Parking ID is {id}.', slot_right: 'Turn right into {label}. It is {size}. Your Parking ID is {id}.',
      slot_straight: 'Drive straight into {label}. It is {size}. Your Parking ID is {id}.', start_slot: 'Enter through the gate and drive straight into {label}. It is {size}. Your Parking ID is {id}.',
      arrive: 'You have arrived at {label}. Park inside the lines. Your Parking ID is {id}.', exit_start: 'Leave {label} and drive {m} metres.',
      exit_arrive: 'You have reached the exit gate. Drive out carefully. Thank you for parking with MARGA.', pre_left: 'In {m} metres, turn left.', pre_right: 'In {m} metres, turn right.', pre_slot: 'In {m} metres, your slot.' },
    hi: { unit: 'मीटर', by: 'गुणा', slotWord: 'स्लॉट', left: 'बाएँ', right: 'दाएँ',
      start: 'गेट से अंदर आइए और {m} मीटर सीधे चलिए।', turn_left: 'बाएँ मुड़िए और {m} मीटर चलिए।', turn_right: 'दाएँ मुड़िए और {m} मीटर चलिए।',
      uturn: 'यू-टर्न लीजिए और {m} मीटर चलिए।', straight: '{m} मीटर सीधे चलते रहिए।', near_left: ' {label} आपके बाएँ होगा।', near_right: ' {label} आपके दाएँ होगा।',
      slot_left: 'बाएँ मुड़कर {label} में जाइए। इसका आकार {size} है। आपकी पार्किंग आईडी {id} है।', slot_right: 'दाएँ मुड़कर {label} में जाइए। इसका आकार {size} है। आपकी पार्किंग आईडी {id} है।',
      slot_straight: 'सीधे {label} में जाइए। इसका आकार {size} है। आपकी पार्किंग आईडी {id} है।', start_slot: 'गेट से अंदर आइए और सीधे {label} में जाइए। इसका आकार {size} है। आपकी पार्किंग आईडी {id} है।',
      arrive: 'आप {label} पर पहुँच गए हैं। लाइनों के अंदर गाड़ी खड़ी कीजिए। आपकी पार्किंग आईडी {id} है।', exit_start: '{label} से निकलिए और {m} मीटर चलिए।',
      exit_arrive: 'आप निकास गेट पर पहुँच गए हैं। सावधानी से बाहर निकलिए। MARGA के साथ पार्किंग के लिए धन्यवाद।', pre_left: '{m} मीटर बाद बाएँ मुड़िए।', pre_right: '{m} मीटर बाद दाएँ मुड़िए।', pre_slot: '{m} मीटर बाद आपका स्लॉट है।' },
    kn: { unit: 'ಮೀಟರ್', by: 'ಬೈ', slotWord: 'ಸ್ಲಾಟ್', left: 'ಎಡ', right: 'ಬಲ',
      start: 'ಗೇಟ್ ಮೂಲಕ ಒಳಗೆ ಬಂದು {m} ಮೀಟರ್ ನೇರವಾಗಿ ಹೋಗಿ.', turn_left: 'ಎಡಕ್ಕೆ ತಿರುಗಿ {m} ಮೀಟರ್ ಹೋಗಿ.', turn_right: 'ಬಲಕ್ಕೆ ತಿರುಗಿ {m} ಮೀಟರ್ ಹೋಗಿ.',
      uturn: 'ಯು-ಟರ್ನ್ ತೆಗೆದುಕೊಂಡು {m} ಮೀಟರ್ ಹೋಗಿ.', straight: '{m} ಮೀಟರ್ ನೇರವಾಗಿ ಮುಂದುವರಿಯಿರಿ.', near_left: ' {label} ನಿಮ್ಮ ಎಡಭಾಗದಲ್ಲಿರುತ್ತದೆ.', near_right: ' {label} ನಿಮ್ಮ ಬಲಭಾಗದಲ್ಲಿರುತ್ತದೆ.',
      slot_left: 'ಎಡಕ್ಕೆ ತಿರುಗಿ {label} ಒಳಗೆ ಹೋಗಿ. ಇದರ ಗಾತ್ರ {size}. ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ {id}.', slot_right: 'ಬಲಕ್ಕೆ ತಿರುಗಿ {label} ಒಳಗೆ ಹೋಗಿ. ಇದರ ಗಾತ್ರ {size}. ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ {id}.',
      slot_straight: 'ನೇರವಾಗಿ {label} ಒಳಗೆ ಹೋಗಿ. ಇದರ ಗಾತ್ರ {size}. ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ {id}.', start_slot: 'ಗೇಟ್ ಮೂಲಕ ಒಳಗೆ ಬಂದು ನೇರವಾಗಿ {label} ಒಳಗೆ ಹೋಗಿ. ಇದರ ಗಾತ್ರ {size}. ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ {id}.',
      arrive: 'ನೀವು {label} ತಲುಪಿದ್ದೀರಿ. ಗೆರೆಗಳ ಒಳಗೆ ವಾಹನ ನಿಲ್ಲಿಸಿ. ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ {id}.', exit_start: '{label} ನಿಂದ ಹೊರಬಂದು {m} ಮೀಟರ್ ಹೋಗಿ.',
      exit_arrive: 'ನೀವು ನಿರ್ಗಮನ ಗೇಟ್ ತಲುಪಿದ್ದೀರಿ. ಎಚ್ಚರಿಕೆಯಿಂದ ಹೊರಗೆ ಹೋಗಿ. MARGA ಜೊತೆ ಪಾರ್ಕ್ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು.', pre_left: '{m} ಮೀಟರ್ ನಂತರ ಎಡಕ್ಕೆ ತಿರುಗಿ.', pre_right: '{m} ಮೀಟರ್ ನಂತರ ಬಲಕ್ಕೆ ತಿರುಗಿ.', pre_slot: '{m} ಮೀಟರ್ ನಂತರ ನಿಮ್ಮ ಸ್ಲಾಟ್.' },
  };
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] == null ? '' : v[k]));
  const fmtM = (len) => Math.max(1, Math.round(len));
  // ctx = { label: 'Slot 34', w, h (slot size in metres), id: 'MRG-XXXXXXXX' }
  function stepText(step, ctx, lang, speech) {
    const t = T[lang] || T.en, num = String(ctx.label).replace(/^\D+/, '');
    const label = `${t.slotWord} ${num}`;
    const a = Math.min(ctx.w, ctx.h).toFixed(1), b = Math.max(ctx.w, ctx.h).toFixed(1);
    const size = speech ? `${a} ${t.by} ${b} ${t.unit}` : `${a} × ${b} ${lang === 'en' ? 'm' : t.unit}`;
    const id = speech ? String(ctx.id).replace(/-/g, ' ').split('').join(' ').replace(/ {2,}/g, ' ') : ctx.id;
    const v = { m: fmtM(step.len), label, size, id };
    let key = step.kind;
    if (key === 'turn') key = step.turn === 'left' ? 'turn_left' : step.turn === 'right' ? 'turn_right' : step.turn === 'uturn' ? 'uturn' : 'straight';
    if (key === 'slot') key = step.turn === 'left' ? 'slot_left' : step.turn === 'right' ? 'slot_right' : 'slot_straight';
    let out = fill(t[key] || t.straight, v);
    if (step.near) out += fill(t[step.near === 'left' ? 'near_left' : 'near_right'], v);
    return out;
  }
  const preText = (step, nextStep, m, lang) => {
    const t = T[lang] || T.en, k = nextStep && nextStep.kind === 'slot' ? 'pre_slot' : (nextStep && nextStep.turn === 'left' ? 'pre_left' : 'pre_right');
    return fill(t[k], { m });
  };
  return { buildRoute, pointAt, stepText, preText, gateXY, T, CELL };
});
