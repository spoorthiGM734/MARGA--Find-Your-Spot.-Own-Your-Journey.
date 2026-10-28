const router = require('express').Router();
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { fail } = require('../utils/http');
const S = require('../services/booking');

const short = (n) => { const p = String(n || 'Driver').trim().split(/\s+/); return p[0] + (p[1] ? ' ' + p[1][0] + '.' : ''); };

router.get('/facility/:id', (req, res) => {
  const rows = db.prepare('SELECT r.id, r.rating, r.comment, r.created_at, u.name FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.facility_id=? ORDER BY r.id DESC LIMIT 50').all(req.params.id);
  const sum = db.prepare('SELECT COUNT(*) c, ROUND(AVG(rating),1) a FROM reviews WHERE facility_id=?').get(req.params.id);
  const dist = [5, 4, 3, 2, 1].map((n) => ({ stars: n, count: db.prepare('SELECT COUNT(*) c FROM reviews WHERE facility_id=? AND rating=?').get(req.params.id, n).c }));
  res.json({ average: sum.a || 0, count: sum.c, distribution: dist, reviews: rows.map((r) => ({ ...r, name: short(r.name) })) });
});

router.use(auth);
router.get('/mine', (req, res) => res.json(db.prepare('SELECT booking_id FROM reviews WHERE user_id=? AND booking_id IS NOT NULL').all(req.user.id).map((r) => r.booking_id)));

router.post('/', (req, res) => {
  const { booking_id, rating, comment } = req.body || {};
  const b = S.getBooking(booking_id);
  if (!b || b.user_id !== req.user.id) fail(404, 'Booking not found');
  if (b.status !== 'completed') fail(400, 'You can review a facility after your parking is completed');
  const r = Math.round(Number(rating));
  if (!(r >= 1 && r <= 5)) fail(400, 'Choose a rating from 1 to 5 stars');
  if (db.prepare('SELECT 1 FROM reviews WHERE booking_id=?').get(b.id)) fail(409, 'You have already reviewed this booking');
  db.prepare('INSERT INTO reviews(facility_id,user_id,booking_id,rating,comment) VALUES(?,?,?,?,?)').run(b.facility_id, req.user.id, b.id, r, String(comment || '').trim().slice(0, 600));
  res.status(201).json({ ok: true });
});
module.exports = router;
