const crypto = require('crypto');
const db = require('../db/database');
const { calcFee } = require('../utils/pricing');
const { fail } = require('../utils/http');
const { pricingFor } = require('../utils/rush');
const { resolveVehicle, DEFAULTS } = require('../utils/vehicles');
const { refundPct } = require('../utils/policy');

const GRACE = Number(process.env.NO_SHOW_GRACE_MIN) || 30;

// bikes use bike slots; cars and SUVs may use car or SUV slots (the size check below decides if the vehicle really fits)
const compatible = (v, s) => (v === 'bike' ? s === 'bike' : s === 'car' || s === 'suv');

// Size check: the vehicle (width x length x height, found from its model) must fit the slot with a little room to open doors
const CLEAR = { car: { w: 0.4, l: 0.1 }, suv: { w: 0.4, l: 0.1 }, bike: { w: 0.1, l: -0.2 } };
function fitCheck(slot, dims, vtype) {
  const c = CLEAR[vtype] || CLEAR.car;
  const sw = Math.min(slot.w, slot.h), sl = Math.max(slot.w, slot.h), needW = dims.w + c.w, needL = dims.l + c.l;
  const ok = sw + 1e-6 >= needW && sl + 1e-6 >= needL;
  return { ok, needW, needL, sw, sl, spareW: sw - dims.w, spareL: sl - dims.l, tight: ok && (sw - dims.w < 0.6 || sl - dims.l < 0.4) };
}
function slotRules(slot, dims, vtype, flags) {
  const f = fitCheck(slot, dims, vtype);
  if (!f.ok) return `${slot.label} (${f.sw.toFixed(1)} × ${f.sl.toFixed(1)} m) is too small for your vehicle (${dims.w.toFixed(2)} × ${dims.l.toFixed(2)} m). It needs at least ${f.needW.toFixed(2)} × ${f.needL.toFixed(2)} m - please choose a larger slot.`;
  if (slot.max_height && dims.h > slot.max_height - 0.05) return `${slot.label} has a height limit of ${slot.max_height} m and your vehicle is about ${dims.h.toFixed(2)} m tall.`;
  if (slot.ev && !dims.ev) return `${slot.label} is an EV charging slot - it is reserved for electric vehicles.`;
  if (slot.accessible && !flags.accessible_permit) return `${slot.label} is an accessible slot reserved for drivers with an accessible-parking permit. Tick the permit box if you hold one.`;
  return null;
}
// Booking fee already paid (net of refunds)
const advancePaid = (bookingId) => db.prepare("SELECT COALESCE(SUM(amount - refunded),0) a FROM payments WHERE booking_id=? AND kind='advance' AND status='paid'").get(bookingId).a;

// Reservations not checked in within GRACE minutes of start become no-shows (slot is released)
function expireStale() {
  const cutoff = new Date(Date.now() - GRACE * 60000).toISOString();
  db.prepare("UPDATE bookings SET status='no_show' WHERE status='confirmed' AND start_time < ?").run(cutoff);
  if (process.env.REQUIRE_ADVANCE === 'true')   // optional: bookings must be paid within 15 minutes or they are released
    db.prepare(`UPDATE bookings SET status='cancelled' WHERE status='confirmed' AND advance_amount>0 AND created_at < datetime('now','-15 minutes')
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.booking_id=bookings.id AND p.kind='advance' AND p.status='paid')`).run();
}

// A car that has checked in stays "occupied" until it has checked out AND paid
function occupiedUntil(o) {
  if (o.status === 'awaiting_payment') return '9999-12-31T00:00:00.000Z';
  const nowIso = new Date().toISOString();
  return o.end_time > nowIso ? o.end_time : new Date(Date.now() + 30 * 60000).toISOString();
}

/* Slot states for a time window. RESERVED (booking) and OCCUPIED (physical) are kept separate. */
function slotStates(facilityId, start, end) {
  expireStale();
  const slots = db.prepare('SELECT * FROM slots WHERE facility_id=? ORDER BY id').all(facilityId);
  const booked = new Set(db.prepare(`
    SELECT slot_id FROM bookings
    WHERE facility_id=? AND status IN ('confirmed','checked_in') AND start_time < ? AND end_time > ?`)
    .all(facilityId, end, start).map((r) => r.slot_id));

  const occRows = db.prepare(`
    SELECT se.actual_slot_id sid, se.occupancy_verified v, b.end_time, b.status
    FROM sessions se JOIN bookings b ON b.id=se.booking_id
    WHERE b.status IN ('checked_in','awaiting_payment') AND b.facility_id=?`).all(facilityId);
  const occ = new Map();
  for (const o of occRows) {
    if (start < occupiedUntil(o)) occ.set(o.sid, o.v);
  }
  return slots.map((s) => ({
    id: s.id, label: s.label, x: s.x, y: s.y, w: s.w, h: s.h, vehicle_type: s.vehicle_type, is_active: s.is_active,
    ev: s.ev, covered: s.covered, accessible: s.accessible, max_height: s.max_height,
    state: !s.is_active ? 'blocked' : occ.has(s.id) ? 'occupied' : booked.has(s.id) ? 'reserved' : 'available',
    occupancy_verified: occ.has(s.id) ? occ.get(s.id) : null,
  }));
}

/* ---------- Create booking: one IMMEDIATE transaction => no double booking ---------- */
const makeRef = () => 'MRG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

const _create = db.transaction((userId, b) => {
  const s = new Date(b.start), e = new Date(b.end);
  if (isNaN(s) || isNaN(e)) fail(400, 'Invalid start or end time');
  if (e <= s) fail(400, 'End time must be after start time');
  if (s.getTime() < Date.now() - 5 * 60000) fail(400, 'Start time is in the past');
  if (e - s > 72 * 3600000) fail(400, 'Maximum booking length is 72 hours');

  const reg = String(b.reg_no || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{4,15}$/.test(reg)) fail(400, 'Enter a valid vehicle registration number');
  const vtype = ['car', 'suv', 'bike'].includes(b.vehicle_type) ? b.vehicle_type : 'car';
  // the vehicle's size comes from its brand/model (typed now, or saved earlier) - the driver never enters measurements
  const veh = b.vehicle_id ? db.prepare('SELECT * FROM vehicles WHERE id=? AND user_id=?').get(b.vehicle_id, userId) : null;
  let dims;
  if (b.vehicle_model) { const r = resolveVehicle(b.vehicle_model, vtype); dims = { w: r.w, l: r.l, h: r.h, ev: r.ev }; }
  else if (veh && veh.width_m) dims = { w: veh.width_m, l: veh.length_m, h: veh.height_m || DEFAULTS[vtype].h, ev: !!veh.is_ev };
  else { const r = resolveVehicle('', vtype); dims = { w: r.w, l: r.l, h: r.h, ev: false }; }
  if (b.ev_vehicle) dims.ev = true;

  const slot = db.prepare(`SELECT s.*, f.verification_status vs, f.layout_status ls
    FROM slots s JOIN facilities f ON f.id=s.facility_id WHERE s.id=?`).get(b.slot_id);
  if (!slot || !slot.is_active) fail(404, 'This slot is not available');
  if (slot.vs !== 'approved' || slot.ls !== 'published') fail(400, 'This facility is not open for bookings');
  if (!compatible(vtype, slot.vehicle_type)) fail(400, `${slot.label} is for ${slot.vehicle_type} vehicles`);
  const ruleErr = slotRules(slot, dims, vtype, { accessible_permit: !!b.accessible_permit });
  if (ruleErr) fail(400, ruleErr);

  const sIso = s.toISOString(), eIso = e.toISOString();
  const clash = db.prepare(`SELECT 1 FROM bookings WHERE slot_id=? AND status IN ('confirmed','checked_in')
    AND start_time < ? AND end_time > ?`).get(slot.id, eIso, sIso);
  if (clash) fail(409, `${slot.label} was just reserved for an overlapping time. Please pick another slot.`);

  const open = db.prepare(`SELECT b.end_time, b.status FROM sessions se JOIN bookings b ON b.id=se.booking_id
    WHERE se.actual_slot_id=? AND b.status IN ('checked_in','awaiting_payment')`).get(slot.id);
  if (open && sIso < occupiedUntil(open)) fail(409, `${slot.label} is currently occupied. Please pick another slot.`);

  const dup = db.prepare(`SELECT 1 FROM bookings WHERE user_id=? AND reg_no=? AND status IN ('confirmed','checked_in')
    AND start_time < ? AND end_time > ?`).get(userId, reg, eIso, sIso);
  if (dup) fail(409, 'This vehicle already has a booking for that time');

  let vehicleId = null;
  if (b.vehicle_id) {
    const v = db.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').get(b.vehicle_id, userId);
    vehicleId = v ? v.id : null;
  }
  // dynamic price (surge / discount) is fixed at booking time; the booking fee is about one hour's charge
  const fac = db.prepare('SELECT f.*, t.hourly_rate, t.min_charge, t.grace_minutes, t.daily_cap FROM facilities f JOIN tariffs t ON t.facility_id=f.id WHERE f.id=?').get(slot.facility_id);
  const mult = pricingFor(fac, s, e).multiplier;
  const est = Math.round(calcFee(Math.ceil((e - s) / 60000), fac) * mult);
  const advance = est > 0 ? Math.min(est, Math.round(Math.max(fac.min_charge || 0, fac.hourly_rate * mult))) : 0;
  return db.prepare(`INSERT INTO bookings(ref,user_id,facility_id,slot_id,vehicle_id,reg_no,vehicle_type,start_time,end_time,rate_multiplier,advance_amount)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(makeRef(), userId, slot.facility_id, slot.id, vehicleId, reg, vtype, sIso, eIso, mult, advance).lastInsertRowid;
});
const createBooking = (userId, b) => { expireStale(); return _create.immediate(userId, b); };

/* ---------- Full booking row (joins) ---------- */
const BOOKING_SQL = `
SELECT b.*, f.name facility_name, f.address facility_address, f.lat, f.lng, f.owner_id,
  sl.label slot_label, sl.x slot_x, sl.y slot_y, sl.w slot_w, sl.h slot_h, sl.vehicle_type slot_type, sl.ev slot_ev, sl.covered slot_covered,
  sl.accessible slot_accessible, sl.max_height slot_max_height, f.width_m site_w, f.length_m site_l, f.entry_side, f.entry_pos, f.exit_side, f.exit_pos, f.layout_v,
  u.name user_name, u.phone user_phone,
  se.id session_id, se.check_in_at, se.check_out_at, se.duration_min, se.fee, se.occupancy_verified,
  se.confirmed_by, se.mismatch, se.resolution_note, se.actual_slot_id, asl.label actual_slot_label,
  se.payment_status, se.paid_at, se.payment_method, se.payment_ref,
  f.upi_id, t.hourly_rate, t.min_charge, t.grace_minutes, t.daily_cap
FROM bookings b
JOIN facilities f ON f.id=b.facility_id
JOIN slots sl ON sl.id=b.slot_id
JOIN users u ON u.id=b.user_id
JOIN tariffs t ON t.facility_id=f.id
LEFT JOIN sessions se ON se.booking_id=b.id
LEFT JOIN slots asl ON asl.id=se.actual_slot_id`;

const getBooking = (id) => db.prepare(BOOKING_SQL + ' WHERE b.id=?').get(id);
const withEstimate = (b) => {
  if (b.status === 'checked_in' && b.check_in_at) {
    const mins = Math.max(1, Math.ceil((Date.now() - new Date(b.check_in_at)) / 60000));
    b.fee_estimate = Math.round(calcFee(mins, b) * (b.rate_multiplier || 1));
  }
  b.advance_paid = advancePaid(b.id);
  b.due = b.status === 'awaiting_payment' ? Math.max(0, Math.round((b.fee - b.advance_paid) * 100) / 100) : 0;
  return b;
};

/* ---------- Check-in (driver = unverified, operator = verified) ---------- */
const _checkIn = db.transaction((id, { by, lat, lng, actualSlotId }) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!b) fail(404, 'Booking not found');
  if (b.status !== 'confirmed') fail(400, `This booking is ${b.status.replace('_', ' ')} and cannot be checked in`);
  const now = Date.now();
  if (now < new Date(b.start_time).getTime() - 15 * 60000) fail(400, 'Too early - check-in opens 15 minutes before start');
  if (now > new Date(b.end_time).getTime()) fail(400, 'This booking has already ended');

  let actual = b.slot_id;
  if (actualSlotId && Number(actualSlotId) !== b.slot_id) {
    const a = db.prepare('SELECT id FROM slots WHERE id=? AND facility_id=?').get(actualSlotId, b.facility_id);
    if (!a) fail(400, 'That slot does not belong to this facility');
    actual = a.id;
  }
  const mismatch = actual !== b.slot_id ? 1 : 0;
  db.prepare(`INSERT INTO sessions(booking_id,actual_slot_id,check_in_at,confirmed_by,occupancy_verified,checkin_lat,checkin_lng,mismatch)
    VALUES(?,?,?,?,?,?,?,?)`).run(id, actual, new Date().toISOString(), by, by === 'operator' ? 1 : 0, lat ?? null, lng ?? null, mismatch);
  db.prepare("UPDATE bookings SET status='checked_in' WHERE id=?").run(id);
  return { mismatch };
});
const checkIn = (id, opts) => { expireStale(); return _checkIn.immediate(id, opts); };

/* ---------- Check-out: fee = time parked x hourly rate x booked price factor; booking fee already paid is credited ---------- */
const _checkOut = db.transaction((id) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!b) fail(404, 'Booking not found');
  if (b.status !== 'checked_in') fail(400, 'This booking is not checked in');
  const se = db.prepare('SELECT * FROM sessions WHERE booking_id=?').get(id);
  const t = db.prepare('SELECT * FROM tariffs WHERE facility_id=?').get(b.facility_id);
  const out = new Date();
  const mins = Math.max(1, Math.ceil((out - new Date(se.check_in_at)) / 60000));
  const fee = Math.round(calcFee(mins, t) * (b.rate_multiplier || 1));
  db.prepare('UPDATE sessions SET check_out_at=?, duration_min=?, fee=? WHERE id=?').run(out.toISOString(), mins, fee, se.id);
  const due = fee - advancePaid(id);
  if (due <= 0) { // free (grace period) or already covered by the booking fee: nothing more to pay, slot is freed immediately
    db.prepare("UPDATE sessions SET payment_status='paid', paid_at=?, payment_method=? WHERE id=?").run(out.toISOString(), fee === 0 ? 'free' : 'booking fee', se.id);
    db.prepare("UPDATE bookings SET status='completed' WHERE id=?").run(id);
  } else {
    db.prepare("UPDATE bookings SET status='awaiting_payment' WHERE id=?").run(id);
  }
});
const checkOut = (id) => { _checkOut.immediate(id); return getBooking(id); };

/* ---------- Payment confirmed -> booking completed -> slot becomes free again ---------- */
const _pay = db.transaction((id, { method, ref }) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!b) fail(404, 'Booking not found');
  if (b.status !== 'awaiting_payment') fail(400, 'This booking is not waiting for payment');
  db.prepare("UPDATE sessions SET payment_status='paid', paid_at=?, payment_method=?, payment_ref=? WHERE booking_id=?")
    .run(new Date().toISOString(), method, ref || null, id);
  db.prepare("UPDATE bookings SET status='completed' WHERE id=?").run(id);
});
const markPaid = (id, opts) => { _pay.immediate(id, opts); return getBooking(id); };

/* ---------- Cancel: returns what must be refunded under the cancellation rules ---------- */
function cancelBooking(id, user) {
  const b = getBooking(id);
  if (!b) fail(404, 'Booking not found');
  if (!(b.user_id === user.id || b.owner_id === user.id || user.role === 'admin')) fail(403, 'Not allowed');
  if (b.status !== 'confirmed') fail(400, 'Only confirmed bookings can be cancelled');
  db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(id);
  const paid = advancePaid(id), pct = refundPct(b.start_time, b.user_id !== user.id);
  return { booking_id: id, advance_paid: paid, pct, refund_amount: Math.round(paid * pct) / 100 };
}

module.exports = { expireStale, slotStates, compatible, createBooking, checkIn, checkOut, markPaid, cancelBooking, fitCheck, slotRules, advancePaid, getBooking, withEstimate, BOOKING_SQL };
