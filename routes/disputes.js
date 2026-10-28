const router = require('express').Router();
const db = require('../db/database');
const { auth, role } = require('../middleware/auth');
const { fail, wrap } = require('../utils/http');
const S = require('../services/booking');
const P = require('../services/payments');

router.use(auth);
const CATS = ['overcharged', 'slot_taken', 'wrong_slot', 'facility_closed', 'refund_not_received', 'other'];
const SQL = `SELECT d.*, b.ref, b.reg_no, b.status booking_status, f.name facility_name, u.name user_name, u.phone user_phone
  FROM disputes d JOIN bookings b ON b.id=d.booking_id JOIN facilities f ON f.id=d.facility_id JOIN users u ON u.id=d.user_id`;

router.post('/', (req, res) => {
  const { booking_id, category, description } = req.body || {};
  const b = S.getBooking(booking_id);
  if (!b || b.user_id !== req.user.id) fail(404, 'Booking not found');
  if (b.status === 'confirmed') fail(400, 'You can report a problem once your booking has started, finished or been cancelled');
  if (!CATS.includes(category)) fail(400, 'Choose what the problem is about');
  const text = String(description || '').trim();
  if (text.length < 10) fail(400, 'Please describe the problem (at least 10 characters)');
  if (db.prepare("SELECT 1 FROM disputes WHERE booking_id=? AND status='open'").get(b.id)) fail(409, 'You already have an open report for this booking');
  const id = db.prepare('INSERT INTO disputes(booking_id,user_id,facility_id,category,description) VALUES(?,?,?,?,?)').run(b.id, req.user.id, b.facility_id, category, text.slice(0, 1000)).lastInsertRowid;
  res.status(201).json({ id });
});
router.get('/mine', (req, res) => res.json(db.prepare(SQL + ' WHERE d.user_id=? ORDER BY d.id DESC').all(req.user.id)));
router.get('/facility/:id', role('operator', 'admin'), (req, res) => {
  const f = db.prepare('SELECT * FROM facilities WHERE id=?').get(req.params.id);
  if (!f) fail(404, 'Facility not found');
  if (req.user.role !== 'admin' && f.owner_id !== req.user.id) fail(403, 'Not your facility');
  res.json(db.prepare(SQL + ' WHERE d.facility_id=? ORDER BY d.status ASC, d.id DESC').all(f.id));
});
router.get('/all', role('admin'), (req, res) => res.json(db.prepare(SQL + ' ORDER BY d.status ASC, d.id DESC LIMIT 200').all()));

// Resolve: refund (full or part of what the driver paid) or reject, with a note
router.post('/:id/resolve', role('operator', 'admin'), wrap(async (req, res) => {
  const d = db.prepare('SELECT d.*, f.owner_id FROM disputes d JOIN facilities f ON f.id=d.facility_id WHERE d.id=?').get(req.params.id);
  if (!d) fail(404, 'Report not found');
  if (req.user.role !== 'admin' && d.owner_id !== req.user.id) fail(403, 'Not your facility');
  if (d.status !== 'open') fail(400, 'This report is already resolved');
  const { action, amount, note } = req.body || {};
  const msg = String(note || '').trim().slice(0, 500);
  if (!msg) fail(400, 'Add a note for the driver');
  let refund = null, amt = 0;
  if (action === 'refund') {
    const b = S.withEstimate(S.getBooking(d.booking_id));
    const paid = b.payment_status === 'paid' ? b.fee : b.advance_paid;
    const already = db.prepare("SELECT COALESCE(SUM(amount),0) a FROM refunds WHERE booking_id=? AND status IN ('processed','manual')").get(b.id).a;
    const room = Math.max(0, Math.round((paid - already) * 100) / 100);
    amt = amount === 'full' || amount == null || amount === '' ? room : Math.round(Number(amount) * 100) / 100;
    if (!(amt > 0)) fail(400, 'There is nothing left to refund for this booking');
    if (amt > room + 0.001) fail(400, `You can refund at most ₹${room} for this booking`);
    refund = await P.refundBooking(b.id, amt, 'dispute', ['advance', 'final'], { allowManual: true });
  } else if (action !== 'reject') fail(400, 'Choose refund or reject');
  db.prepare("UPDATE disputes SET status=?, resolution_note=?, refund_amount=?, resolved_at=datetime('now') WHERE id=?").run(action === 'refund' ? 'refunded' : 'rejected', msg, amt, d.id);
  res.json({ ok: true, refund });
}));
module.exports = router;
