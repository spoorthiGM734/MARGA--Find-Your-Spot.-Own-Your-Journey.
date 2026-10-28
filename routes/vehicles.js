const router = require('express').Router();
const db = require('../db/database');
const { auth } = require('../middleware/auth');
const { fail } = require('../utils/http');
const { resolveVehicle, suggest } = require('../utils/vehicles');

// public helpers (no login needed): the app finds the vehicle size from the brand / model text
router.get('/resolve', (req, res) => res.json(resolveVehicle(String(req.query.text || ''), req.query.type)));
router.get('/models', (req, res) => res.json(suggest(String(req.query.q || ''), req.query.type)));

router.use(auth);
router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY id DESC').all(req.user.id)));

router.post('/', (req, res) => {
  const reg = String(req.body.reg_no || '').toUpperCase().replace(/\s+/g, '');
  const type = ['car', 'suv', 'bike'].includes(req.body.type) ? req.body.type : 'car';
  if (!/^[A-Z0-9-]{4,15}$/.test(reg)) fail(400, 'Enter a valid registration number');
  if (db.prepare('SELECT 1 FROM vehicles WHERE user_id=? AND reg_no=?').get(req.user.id, reg)) fail(409, 'Vehicle already added');
  const r = resolveVehicle(String(req.body.model_text || '').slice(0, 80), type);
  const isEv = req.body.is_ev ? 1 : r.ev ? 1 : 0;
  const id = db.prepare('INSERT INTO vehicles(user_id,reg_no,type,label,brand,model,width_m,length_m,height_m,is_ev) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(req.user.id, reg, r.type, String(req.body.label || '').trim(), r.brand, r.model || String(req.body.model_text || '').trim().slice(0, 60) || null, r.w, r.l, r.h, isEv).lastInsertRowid;
  res.status(201).json({ ...db.prepare('SELECT * FROM vehicles WHERE id=?').get(id), detected: r });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vehicles WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});
module.exports = router;
