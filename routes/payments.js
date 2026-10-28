const router = require('express').Router();
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { fail, wrap } = require('../utils/http');
const S = require('../services/booking');
const P = require('../services/payments');
const policy = require('../utils/policy');

router.get('/config', (req, res) => res.json({ live: P.prov.LIVE, key_id: P.prov.LIVE ? P.prov.KEY_ID : null, demo: process.env.DEMO_PAYMENTS === 'true',
  rules: policy.RULES, full_refund_minutes: policy.FULL_MIN, partial_pct: policy.PARTIAL_PCT }));

// Razorpay calls this when a payment is captured, so the booking is confirmed automatically even if the driver closes the page.
// (server.js gives this route the raw request body, which is needed to check the signature)
router.post('/webhook', (req, res) => {
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!P.prov.verifyWebhook(raw, req.headers['x-razorpay-signature'])) return res.status(400).json({ error: 'Invalid signature' });
  let ev; try { ev = JSON.parse(raw); } catch { return res.status(400).json({ error: 'Bad payload' }); }
  const pay = ev.payload && ev.payload.payment && ev.payload.payment.entity;
  if (pay && ['payment.captured', 'order.paid'].includes(ev.event)) {
    const row = db.prepare('SELECT * FROM payments WHERE order_id=?').get(pay.order_id);
    if (row) P.applyPaid(row, pay.id);
  }
  res.json({ ok: true });
});

router.use(auth);
const myBooking = (req, id) => {
  const b = S.getBooking(id);
  if (!b) fail(404, 'Booking not found');
  if (!(b.user_id === req.user.id || b.owner_id === req.user.id || req.user.role === 'admin')) fail(403, 'Not allowed');
  return b;
};

router.post('/order', wrap(async (req, res) => {
  const { booking_id, kind } = req.body || {};
  if (!['advance', 'final'].includes(kind)) fail(400, 'Invalid payment type');
  const b = myBooking(req, booking_id);
  const o = await P.newOrder(b, kind);
  const u = db.prepare('SELECT name,email,phone FROM users WHERE id=?').get(req.user.id);
  res.json({ ...o, booking_ref: b.ref, prefill: { name: u.name, email: u.email, contact: u.phone || '' } });
}));

// Called with what Razorpay Checkout returns: order id, payment id and signature. Signature is verified on the server.
router.post('/verify', (req, res) => {
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body || {};
  const row = db.prepare('SELECT * FROM payments WHERE order_id=?').get(oid);
  if (!row) fail(404, 'Unknown payment order');
  myBooking(req, row.booking_id);
  if (row.status !== 'paid') {
    if (!P.prov.verifySignature(oid, pid, sig)) fail(400, 'Payment could not be verified. If money was deducted it will be refunded automatically.');
    P.applyPaid(row, pid);
  }
  res.json({ ok: true, booking: S.withEstimate(S.getBooking(row.booking_id)) });
});

// Test gateway only (when no Razorpay keys are configured): behaves like the Razorpay checkout result
router.post('/mock/pay', (req, res) => {
  if (P.prov.LIVE) fail(404, 'Not available');
  const { order_id, success } = req.body || {};
  const row = db.prepare('SELECT * FROM payments WHERE order_id=?').get(order_id);
  if (!row || row.provider !== 'mock') fail(404, 'Unknown test order');
  myBooking(req, row.booking_id);
  if (!success) return res.status(402).json({ error: 'Payment failed (test gateway)' });
  res.json(P.prov.mockPay(order_id));
});
module.exports = router;
