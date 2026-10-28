const router = require('express').Router();
const QRCode = require('qrcode');
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { fail, wrap } = require('../utils/http');
const S = require('../services/booking');
const P = require('../services/payments');

router.use(auth);

router.post('/', (req, res) => {
  const id = S.createBooking(req.user.id, req.body || {});
  res.status(201).json({ id, booking: S.getBooking(id) });
});

router.get('/mine', (req, res) => {
  S.expireStale();
  const rows = db.prepare(S.BOOKING_SQL + ' WHERE b.user_id=? ORDER BY b.start_time DESC LIMIT 100').all(req.user.id);
  res.json(rows.map(S.withEstimate));
});

router.get('/:id', wrap(async (req, res) => {
  const b = S.getBooking(req.params.id);
  if (!b) fail(404, 'Booking not found');
  if (!(b.user_id === req.user.id || b.owner_id === req.user.id || req.user.role === 'admin')) fail(403, 'Not allowed');
  const qr = await QRCode.toDataURL(b.ref, { margin: 1, width: 260, color: { dark: '#1b1f2b', light: '#ffffff' } });
  res.json({ ...S.withEstimate(b), qr });
}));

const mine = (req) => {
  const b = S.getBooking(req.params.id);
  if (!b) fail(404, 'Booking not found');
  if (b.user_id !== req.user.id) fail(403, 'This is not your booking');
  return b;
};

const canView = (req, b) => b.user_id === req.user.id || b.owner_id === req.user.id || req.user.role === 'admin';

// Payable amount + UPI payment QR (amount is baked into the QR)
router.get('/:id/payment', wrap(async (req, res) => {
  const b = S.getBooking(req.params.id);
  if (!b) fail(404, 'Booking not found');
  if (!canView(req, b)) fail(403, 'Not allowed');
  if (!['awaiting_payment', 'completed'].includes(b.status)) fail(400, 'Check out first to get the payable amount');
  const adv = S.advancePaid(b.id), due = b.status === 'awaiting_payment' ? Math.max(0, Math.round((b.fee - adv) * 100) / 100) : 0;
  let upi_uri = null, qr = null;
  if (b.upi_id && b.status === 'awaiting_payment') {
    upi_uri = `upi://pay?pa=${b.upi_id}&pn=${encodeURIComponent(b.facility_name)}&am=${due.toFixed(2)}&cu=INR&tr=${b.ref}&tn=${encodeURIComponent('MARGA ' + b.ref)}`;
    qr = await QRCode.toDataURL(upi_uri, { margin: 1, width: 280, color: { dark: '#1b1f2b', light: '#ffffff' } });
  }
  res.json({ status: b.status, amount: due, fee: b.fee, advance_paid: adv, live: P.prov.LIVE, upi_id: b.upi_id, upi_uri, qr, ref: b.ref, facility_name: b.facility_name,
    duration_min: b.duration_min, demo: process.env.DEMO_PAYMENTS === 'true' });
}));

// Demo only: lets you present the full flow without a real payment gateway
router.post('/:id/pay-demo', (req, res) => {
  if (process.env.DEMO_PAYMENTS !== 'true') fail(403, 'Demo payments are disabled');
  const b = mine(req);
  res.json(S.markPaid(b.id, { method: 'demo', ref: 'DEMO-' + Date.now() }));
});

router.post('/:id/cancel', wrap(async (req, res) => {
  const c = S.cancelBooking(req.params.id, req.user);
  const refund = c.refund_amount > 0 ? await P.refundBooking(c.booking_id, c.refund_amount, 'cancel', ['advance']) : null;
  res.json({ ok: true, advance_paid: c.advance_paid, refund_pct: c.pct, refund });
}));

router.post('/:id/checkin', (req, res) => {
  const b = mine(req);
  const { lat, lng, actual_slot_id } = req.body || {};
  const r = S.checkIn(b.id, { by: 'driver', lat, lng, actualSlotId: actual_slot_id });
  res.json({ ok: true, mismatch: r.mismatch });
});

router.post('/:id/checkout', wrap(async (req, res) => {
  const b = mine(req);
  const done = S.checkOut(b.id);
  const adv = S.advancePaid(b.id);             // booking fee that was more than the final charge is refunded
  if (adv > done.fee) await P.refundBooking(b.id, Math.round((adv - done.fee) * 100) / 100, 'excess_advance', ['advance']);
  res.json(S.withEstimate(S.getBooking(b.id)));
}));

module.exports = router;
