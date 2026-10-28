/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const toLocalInput = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

const store = {
  get token() { return localStorage.getItem('marga_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('marga_user')); } catch (e) { return null; } },
  save(t, u) { localStorage.setItem('marga_token', t); localStorage.setItem('marga_user', JSON.stringify(u)); },
  clear() { localStorage.removeItem('marga_token'); localStorage.removeItem('marga_user'); },
};
const HOME = { driver: '/dashboard.html', operator: '/operator.html', admin: '/admin.html' };

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (store.token) headers.Authorization = 'Bearer ' + store.token;
  const r = await fetch('/api' + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && store.token) { store.clear(); }
    throw new Error(d.error || 'Request failed');
  }
  return d;
}

function toast(msg, type = 'ok') {
  let box = $('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'err' ? 'err' : '');
  t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

function modal(html, wide) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="modal-box${wide ? ' wide' : ''}"><button class="x" aria-label="Close">×</button>${html}</div>`;
  m.addEventListener('mousedown', (e) => { if (e.target === m || e.target.classList.contains('x')) m.remove(); });
  document.body.appendChild(m);
  m.close = () => m.remove();
  return m;
}

const PIN = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="#b7ff3c" d="M12 1.5a8 8 0 0 0-8 8c0 5.6 6.2 11.6 7.1 12.4a1.3 1.3 0 0 0 1.8 0C13.8 21.1 20 15.1 20 9.5a8 8 0 0 0-8-8z"/><circle cx="12" cy="9.5" r="5" fill="#1b1f2b"/><text x="12" y="12.2" text-anchor="middle" font-size="7.5" font-weight="800" fill="#b7ff3c" font-family="Arial">P</text></svg>`;

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; const b = document.getElementById('installBtn'); if (b) b.hidden = false; });
function initNavExtras() {
  const sel = document.getElementById('langSel');
  if (sel) { sel.value = (window.MargaI18n && window.MargaI18n.lang) || 'en'; sel.onchange = () => window.MargaI18n && window.MargaI18n.set(sel.value); }
  const ib = document.getElementById('installBtn');
  if (ib) { ib.hidden = !deferredInstall; ib.onclick = async (e) => { e.preventDefault(); if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; ib.hidden = true; }; }
}

function renderNav() {
  const u = store.user;
  $('nav').className = 'nav';
  $('nav').innerHTML = `<div class="wrap nav-in">
    <a href="/" class="brand">${PIN}<span>MARGA</span></a>
    <div class="nav-links">
      <a href="/search.html">Find parking</a>
      ${u ? `<a href="${HOME[u.role]}">Dashboard</a><a href="#" id="logout">Logout (${esc(u.name.split(' ')[0])})</a>`
          : `<a href="/auth.html">Log in</a><a class="btn sm" href="/auth.html?tab=register">Sign up</a>`}
      <select id="langSel" class="lang" aria-label="Language"><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option></select>
      <a href="#" id="installBtn" class="btn sm" hidden>Install app</a>
    </div></div>`;
  initNavExtras();
  const lo = $('logout');
  if (lo) lo.onclick = (e) => { e.preventDefault(); store.clear(); location.href = '/'; };
}

function requireRole(...roles) {
  const u = store.user;
  if (!u || !store.token) { location.href = '/auth.html?next=' + encodeURIComponent(location.pathname + location.search); return false; }
  if (roles.length && !roles.includes(u.role)) { location.href = HOME[u.role] || '/'; return false; }
  return true;
}

const BADGE = { confirmed: 'b-info', checked_in: 'b-ok', awaiting_payment: 'b-warn', completed: 'b-mute', cancelled: 'b-err', no_show: 'b-warn',
  approved: 'b-ok', pending: 'b-warn', rejected: 'b-err', published: 'b-ok', draft: 'b-warn', none: 'b-mute' };
const badge = (s) => `<span class="badge ${BADGE[s] || 'b-mute'}">${esc(String(s).replace('_', ' '))}</span>`;

/* same pricing rules as the server: pro-rated by the minute (used for the estimate shown before booking) */
function calcFee(mins, t) {
  if (mins <= (t.grace_minutes || 0)) return 0;
  const full = Math.floor(mins / 1440), rem = mins - full * 1440;
  const part = (m) => (m <= 0 ? 0 : Math.max(t.min_charge || 0, (m / 60) * t.hourly_rate));
  let r = part(rem); if (t.daily_cap) r = Math.min(r, t.daily_cap);
  return Math.round(full * (t.daily_cap || 24 * t.hourly_rate) + r);
}

/* ---------- vehicle / slot helpers (the vehicle size itself comes from the server, found from the brand + model) ---------- */
const CLEAR = { car: { w: 0.4, l: 0.1 }, suv: { w: 0.4, l: 0.1 }, bike: { w: 0.1, l: -0.2 } };
function fitInfo(slot, d, type) {
  const c = CLEAR[type] || CLEAR.car, sw = Math.min(slot.w, slot.h), sl = Math.max(slot.w, slot.h), needW = d.w + c.w, needL = d.l + c.l;
  const ok = sw + 1e-6 >= needW && sl + 1e-6 >= needL;
  return { ok, needW, needL, sw, sl, spareW: sw - d.w, spareL: sl - d.l, tight: ok && (sw - d.w < 0.6 || sl - d.l < 0.4) };
}
const sizeText = (s) => `${Math.min(s.w, s.h).toFixed(1)} × ${Math.max(s.w, s.h).toFixed(1)} m`;
const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
const gateXY = (side, pos, W, L) => { pos = Math.min(1, Math.max(0, +pos)); return side === 'top' ? { x: pos * W, y: 0 } : side === 'left' ? { x: 0, y: pos * L } : side === 'right' ? { x: W, y: pos * L } : { x: pos * W, y: L }; };
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const t = document.createElement('script'); t.src = src; t.onload = res; t.onerror = () => rej(new Error('Could not load the payment window - check your internet connection')); document.head.appendChild(t);
  });
}

/* ---------- SVG parking layout (used by facility page, drive guide and operator editor) ---------- */
function renderLayout(el, fac, slots, o = {}) {
  const W = fac.width_m, L = fac.length_m, hasGates = fac.entry_side != null, pad = hasGates ? 3.4 : 1;
  let h = `<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${L + 2 * pad + (hasGates ? 0 : 3)}" class="layout-svg" xmlns="http://www.w3.org/2000/svg"><rect class="site" x="0" y="0" width="${W}" height="${L}" rx=".4"/>`;
  slots.forEach((s) => {
    const mineRef = o.mine && o.mine[s.id], isSel = o.selected === s.id, info = isSel || mineRef;
    const num = esc(s.label.replace('Slot ', '')), cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    let inner;
    if (info && Math.min(s.w, s.h) >= 2) {
      if (s.h >= s.w) {            // tall slot: number on top, size at the bottom, Parking ID along the slot
        inner = `<text x="${cx}" y="${s.y + 1.1}" style="font-size:1.3px">${num}</text>` +
          (mineRef ? `<text transform="translate(${cx} ${cy + 0.2}) rotate(-90)" style="font-size:.52px">${esc(mineRef)}</text>` : '') +
          `<text x="${cx}" y="${s.y + s.h - 0.7}" style="font-size:.5px">${sizeText(s)}</text>`;
      } else {                     // wide slot (rotated layouts)
        inner = `<text x="${cx}" y="${cy - 0.55}" style="font-size:1.2px">${num}</text>` + (mineRef ? `<text x="${cx}" y="${cy + 0.4}" style="font-size:.5px">${esc(mineRef)}</text>` : '') +
          `<text x="${cx}" y="${cy + (mineRef ? 0.95 : 0.5)}" style="font-size:.45px">${sizeText(s)}</text>`;
      }
    } else inner = `<text x="${cx}" y="${cy}" style="font-size:${Math.min(1.4, Math.min(s.w, s.h) * 0.5)}px">${num}</text>`;
    const icons = (s.ev ? '⚡' : '') + (s.accessible ? '♿' : '');
    h += `<g class="slot ${s.state}${isSel ? ' sel' : ''}${mineRef ? ' mine' : ''}" data-id="${s.id}"><title>${esc(s.label)} · ${sizeText(s)}${s.ev ? ' · EV charging' : ''}${s.covered ? ' · covered' : ''}${s.accessible ? ' · accessible' : ''}${s.max_height ? ' · max height ' + s.max_height + ' m' : ''}${mineRef ? ' · Parking ID ' + esc(mineRef) : ''}</title>
      <rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx=".2"/>${inner}${icons ? `<text class="ic" x="${s.x + 0.1 + (icons.length > 1 ? 0.6 : 0.4)}" y="${s.y + 0.6}">${icons}</text>` : ''}</g>`;
  });
  if (hasGates) {
    const e = { side: fac.entry_side || 'bottom', pos: fac.entry_pos == null ? 0.5 : fac.entry_pos };
    const x = fac.exit_side ? { side: fac.exit_side, pos: fac.exit_pos == null ? 0.5 : fac.exit_pos } : null;
    const same = !x || (x.side === e.side && Math.abs(x.pos - e.pos) < 0.02);
    const ARR_IN = { bottom: '▲', top: '▼', left: '▶', right: '◀' }, ARR_OUT = { bottom: '▼', top: '▲', left: '◀', right: '▶' };
    const gate = (g, cls, label) => {
      const p = gateXY(g.side, g.pos, W, L), horiz = g.side === 'top' || g.side === 'bottom';
      const bar = horiz ? `<rect class="${cls}" x="${p.x - 1.6}" y="${p.y - 0.35}" width="3.2" height="0.7" rx=".2"/>` : `<rect class="${cls}" x="${p.x - 0.35}" y="${p.y - 1.6}" width="0.7" height="3.2" rx=".2"/>`;
      const tx = g.side === 'left' ? `translate(${-1.9} ${p.y}) rotate(-90)` : g.side === 'right' ? `translate(${W + 1.9} ${p.y}) rotate(90)` : `translate(${p.x} ${g.side === 'top' ? -1.9 : L + 1.9})`;
      return bar + `<text class="gate-txt" transform="${tx}">${label}</text>`;
    };
    h += same ? gate(e, 'gate-in', `${ARR_IN[e.side]} ENTRY / EXIT`) : gate(e, 'gate-in', `${ARR_IN[e.side]} ENTRY`) + gate(x, 'gate-out', `${ARR_OUT[x.side]} EXIT`);
  } else h += `<text class="ent" x="${W / 2}" y="${L + 2.2}">▲ ENTRANCE / EXIT</text>`;
  h += '</svg>';
  el.innerHTML = h;
  const svg = el.querySelector('svg');
  const toSvg = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };

  el.querySelectorAll('.slot').forEach((g) => {
    const s = slots.find((x) => x.id === +g.dataset.id);
    if (o.onMove) { // operator editor: click to select, drag to move
      let st = null;
      g.addEventListener('pointerdown', (e) => { g.setPointerCapture(e.pointerId); st = { p: toSvg(e), x: s.x, y: s.y, moved: false, nx: s.x, ny: s.y }; });
      g.addEventListener('pointermove', (e) => {
        if (!st) return;
        const p = toSvg(e), dx = p.x - st.p.x, dy = p.y - st.p.y;
        if (Math.hypot(dx, dy) > 0.3) st.moved = true;
        if (!st.moved) return;
        st.nx = Math.min(Math.max(0, st.x + dx), W - s.w); st.ny = Math.min(Math.max(0, st.y + dy), L - s.h);
        g.setAttribute('transform', `translate(${st.nx - st.x},${st.ny - st.y})`);
      });
      g.addEventListener('pointerup', () => {
        if (!st) return;
        const r = st; st = null;
        if (r.moved) o.onMove(s.id, Math.round(r.nx * 10) / 10, Math.round(r.ny * 10) / 10);
        else if (o.onClick) o.onClick(s);
      });
    } else {
      g.addEventListener('click', () => o.onClick && o.onClick(s));
    }
  });
}

/* ---------- shared dialogs ---------- */
async function checkinDialog(b, url, byDriver, done) {
  const { slots } = await api(`/facilities/${b.facility_id}/slots?start=${encodeURIComponent(b.start_time)}&end=${encodeURIComponent(b.end_time)}`);
  const m = modal(`<h3>Check in · ${esc(b.reg_no)}</h3>
    <p class="muted mt">Booked slot: <b style="color:#fff">${esc(b.slot_label)}</b>. If the vehicle is actually in a different space, choose it so the operator can resolve it.</p>
    <label>Actual slot</label>
    <select id="ciSlot">${slots.filter((s) => s.state !== 'blocked').map((s) => `<option value="${s.id}" ${s.id === b.slot_id ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select>
    <p class="note">${byDriver ? 'If you allow it, your phone location is saved as supporting information only. It does not prove which space you are in, so this check-in is marked unverified until an operator confirms it.' : 'Confirmed by the operator - recorded as operator-verified.'}</p>
    <button class="btn block" id="ciGo">Confirm check-in</button>`);
  m.querySelector('#ciGo').onclick = async () => {
    const btn = m.querySelector('#ciGo'); btn.disabled = true;
    const pos = byDriver && navigator.geolocation
      ? await new Promise((r) => navigator.geolocation.getCurrentPosition((p) => r(p.coords), () => r(null), { timeout: 4000 })) : null;
    try {
      const r = await api(url, { method: 'POST', body: { actual_slot_id: +m.querySelector('#ciSlot').value, lat: pos && pos.latitude, lng: pos && pos.longitude } });
      m.close(); toast(r.mismatch ? 'Checked in - different slot recorded, operator will review' : 'Checked in'); done();
    } catch (e) { toast(e.message, 'err'); btn.disabled = false; }
  };
}

function receiptModal(b) {
  modal(`<h3>Parking receipt</h3>
    <div class="kv mt"><span>Reference</span><b>${esc(b.ref)}</b><span>Facility</span><b>${esc(b.facility_name)}</b>
    <span>Booked slot</span><b>${esc(b.slot_label)}</b>${b.mismatch ? `<span>Actual slot</span><b>${esc(b.actual_slot_label)}</b>` : ''}
    <span>Vehicle</span><b>${esc(b.reg_no)}</b><span>Check-in</span><b>${fmt(b.check_in_at)}</b><span>Check-out</span><b>${fmt(b.check_out_at)}</b>
    <span>Duration</span><b>${Math.floor(b.duration_min / 60)}h ${b.duration_min % 60}m</b>
    <span>Rate</span><b>${inr(b.hourly_rate)}/hr${b.rate_multiplier && b.rate_multiplier !== 1 ? ' × ' + b.rate_multiplier + ' (' + (b.rate_multiplier > 1 ? 'busy-time price' : 'quiet-time discount') + ')' : ''}, billed by the minute${b.daily_cap ? ', cap ' + inr(b.daily_cap) + '/day' : ''}</b>
    ${b.advance_paid ? `<span>Booking fee (paid in advance)</span><b>${inr(b.advance_paid)}</b>` : ''}<span>Payment</span><b>${b.payment_status === 'paid' ? 'Paid (' + esc(b.payment_method) + ') · ' + fmt(b.paid_at) : 'Unpaid'}</b></div>
    <h2 style="color:var(--lime)">Total: ${inr(b.fee)}</h2>
    <p class="note">Fee = time between check-in and check-out × hourly rate. Times come from check-in / check-out events recorded in Marga (${b.occupancy_verified ? 'confirmed by operator' : 'confirmed by driver - unverified'}). Marga does not independently verify physical entry or exit.</p>`);
}

/* ---------- payment: exact amount + UPI QR; slot is freed only after payment is confirmed ---------- */
async function paymentModal(id, opts = {}) {
  let p;
  try { p = await api(`/bookings/${id}/payment`); } catch (e) { return toast(e.message, 'err'); }
  const m = modal(`<h3>Payment due</h3>
    <p class="muted">${esc(p.facility_name)} · ${esc(p.ref)} · parked ${Math.floor(p.duration_min / 60)}h ${p.duration_min % 60}m</p>
    <h1 style="color:var(--lime);margin:10px 0">${inr(p.amount)}</h1>${p.advance_paid ? `<p class="note">Total ${inr(p.fee)} − booking fee already paid ${inr(p.advance_paid)}</p>` : ''}
    ${p.qr ? `<div style="text-align:center"><img src="${p.qr}" style="width:230px;border-radius:12px" alt="UPI payment QR">
      <p class="note">Scan with any UPI app (GPay, PhonePe, Paytm…) to pay ${inr(p.amount)} to <b>${esc(p.upi_id)}</b></p>
      <a class="btn ghost sm" href="${esc(p.upi_uri)}">Open UPI app</a></div>`
      : '<div class="warn-box">This facility has not added a UPI ID yet. Pay at the exit and ask the operator to confirm.</div>'}
    <p class="note" id="payState">${opts.operator ? 'Confirm below once you have received the money.' : 'Waiting for payment confirmation… your slot is released once payment is confirmed.'}</p>
    <div id="payBtns" class="mt"></div>`);
  const btns = m.querySelector('#payBtns');
  let poll = null;
  const finish = (b) => { clearInterval(poll); m.close(); toast('Payment received. The slot is free again.'); if (opts.onDone) opts.onDone(); receiptModal(b); };

  if (opts.operator) {
    btns.innerHTML = '<button class="btn block" id="pUpi">Mark as paid (UPI received)</button><button class="btn ghost block mt" id="pCash">Cash received</button>';
    const pay = async (method) => {
      let ref = '';
      if (method === 'upi') { ref = prompt('UPI transaction ID (optional)'); if (ref === null) return; }
      try { finish(await api(`/operator/bookings/${id}/pay`, { method: 'POST', body: { method, txn_ref: ref } })); } catch (e) { toast(e.message, 'err'); }
    };
    m.querySelector('#pUpi').onclick = () => pay('upi');
    m.querySelector('#pCash').onclick = () => pay('cash');
  } else {
    btns.innerHTML = '<button class="btn block" id="pOnline">Pay online (UPI / card / netbanking)</button>' + (p.demo ? '<button class="btn ghost block mt" id="pDemo">Simulate payment (demo mode)</button>' : '');
    m.querySelector('#pOnline').onclick = () => payOnline(id, 'final', async () => { try { finish(await api('/bookings/' + id)); } catch (e) { m.close(); if (opts.onDone) opts.onDone(); } });
    if (p.demo) m.querySelector('#pDemo').onclick = async () => { try { finish(await api(`/bookings/${id}/pay-demo`, { method: 'POST' })); } catch (e) { toast(e.message, 'err'); } };
    poll = setInterval(async () => {   // the operator confirming the payment completes the booking
      if (!document.body.contains(m)) { clearInterval(poll); return; }
      try { const b = await api('/bookings/' + id); if (b.status === 'completed') finish(b); } catch (e) { /* keep waiting */ }
    }, 4000);
  }
}


/* ---------- online payment: Razorpay Checkout when keys are configured, otherwise the built-in test checkout ---------- */
// onDone(booking) when the payment is verified; onCancel() if it was closed, failed or could not start (called at most once).
async function payOnline(bookingId, kind, onDone, onCancel) {
  let settled = false;
  const done = (b) => { if (settled) return; settled = true; if (onDone) onDone(b); };
  const cancel = () => { if (settled) return; settled = true; if (onCancel) onCancel(); };
  let o;
  try { o = await api('/payments/order', { method: 'POST', body: { booking_id: bookingId, kind } }); } catch (e) { toast(e.message, 'err'); return cancel(); }
  const verify = async (r) => {
    try { const v = await api('/payments/verify', { method: 'POST', body: r }); toast('Payment successful'); done(v.booking); }
    catch (e) { toast(e.message, 'err'); cancel(); }
  };
  if (o.live) {
    try { await loadScript('https://checkout.razorpay.com/v1/checkout.js'); } catch (e) { toast(e.message, 'err'); return cancel(); }
    const rz = new window.Razorpay({ key: o.key_id, amount: o.amount_paise, currency: 'INR', name: 'MARGA', description: o.description, order_id: o.order_id, prefill: o.prefill,
      theme: { color: '#b7ff3c' }, handler: verify, modal: { ondismiss: () => { toast('Payment window closed'); cancel(); } } });
    rz.on('payment.failed', (r) => toast((r.error && r.error.description) || 'Payment failed', 'err'));
    rz.open(); return;
  }
  const m = modal(`<h3>Test checkout <span class="badge b-warn">no real money</span></h3>
    <p class="muted">${esc(o.description)}</p><h1 style="color:var(--lime);margin:10px 0">${inr(o.amount)}</h1>
    <div class="chips2"><span class="chip-cb on">UPI</span><span class="chip-cb">Card</span><span class="chip-cb">Netbanking</span></div>
    <p class="note">This is MARGA’s built-in test gateway. It follows the same steps as Razorpay (order, payment, signature check) so you can try the full flow. Add your Razorpay keys in the .env file to take real payments.</p>
    <button class="btn block" id="tOk">Pay ${inr(o.amount)}</button><button class="btn ghost block mt" id="tNo">Simulate a failed payment</button>`);
  const rm = m.remove.bind(m); let busy = false;
  m.remove = () => { rm(); if (!busy) cancel(); };           // closing the window without paying = cancelled
  const go = async (success) => {
    busy = true; m.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try { const r = await api('/payments/mock/pay', { method: 'POST', body: { order_id: o.order_id, success } }); rm(); await verify(r); }
    catch (e) { toast(e.message, 'err'); rm(); cancel(); }
  };
  m.querySelector('#tOk').onclick = () => go(true); m.querySelector('#tNo').onclick = () => go(false);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('/sw.js').catch(() => {});
