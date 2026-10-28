const db = require('../db/database');
const prov = require('../utils/payments');
const S = require('./booking');
const { fail } = require('../utils/http');
const r2 = (n) => Math.round(n * 100) / 100;
const grossAdvance = (id) => db.prepare("SELECT COALESCE(SUM(amount),0) a FROM payments WHERE booking_id=? AND kind='advance' AND status='paid'").get(id).a;

// Create (or reuse) a gateway order for the booking fee ('advance') or the balance at exit ('final')
async function newOrder(b, kind) {
  let amount;
  if (kind === 'advance') {
    if (b.status !== 'confirmed') fail(400, 'The booking fee can only be paid for an upcoming booking');
    if (!(b.advance_amount > 0)) fail(400, 'There is no booking fee for this booking');
    if (grossAdvance(b.id) > 0) fail(409, 'The booking fee is already paid');
    amount = b.advance_amount;
  } else {
    if (b.status !== 'awaiting_payment') fail(400, 'There is nothing to pay yet - check out first');
    amount = r2(b.fee - S.advancePaid(b.id));
    if (amount <= 0) fail(400, 'Nothing is due for this booking');
  }
  const existing = db.prepare("SELECT * FROM payments WHERE booking_id=? AND kind=? AND status='created' AND amount=? ORDER BY id DESC").get(b.id, kind, amount);
  let o = existing ? { order_id: existing.order_id, provider: existing.provider } : await prov.createOrder({ amount, receipt: `${b.ref}-${kind}`, notes: { booking: b.ref, kind } });
  if (!existing) db.prepare('INSERT INTO payments(booking_id,kind,provider,order_id,amount) VALUES(?,?,?,?,?)').run(b.id, kind, o.provider, o.order_id, amount);
  return { order_id: o.order_id, amount, amount_paise: Math.round(amount * 100), currency: 'INR', live: prov.LIVE, key_id: prov.LIVE ? prov.KEY_ID : null,
    description: `${kind === 'advance' ? 'Booking fee' : 'Parking charge'} - ${b.facility_name} (${b.ref})` };
}

// Idempotent: used by the browser callback AND the Razorpay webhook, whichever arrives first
function applyPaid(row, paymentId) {
  const changed = db.transaction(() => {
    const cur = db.prepare('SELECT * FROM payments WHERE id=?').get(row.id);
    if (cur.status === 'paid') return false;
    db.prepare("UPDATE payments SET status='paid', payment_id=?, paid_at=? WHERE id=?").run(paymentId, new Date().toISOString(), row.id);
    return true;
  }).immediate();
  if (changed && row.kind === 'final') {
    const b = db.prepare('SELECT status FROM bookings WHERE id=?').get(row.booking_id);
    if (b && b.status === 'awaiting_payment') S.markPaid(row.booking_id, { method: 'online', ref: paymentId });
  }
  return changed;
}

// Refund up to `amount` through the gateway. Anything that was paid outside the gateway (cash / UPI QR) is recorded as a manual refund.
async function refundBooking(bookingId, amount, reason, kinds = ['advance', 'final'], opts = {}) {
  let left = r2(amount); const details = []; let refunded = 0;
  const rows = db.prepare(`SELECT * FROM payments WHERE booking_id=? AND status='paid' AND kind IN (${kinds.map(() => '?').join(',')}) ORDER BY id`).all(bookingId, ...kinds);
  for (const p of rows) {
    if (left <= 0) break;
    const can = r2(p.amount - p.refunded); if (can <= 0) continue;
    const amt = Math.min(can, left);
    let r; try { r = await prov.refund(p.payment_id, amt, { booking: bookingId, reason }); } catch (e) { r = { refund_id: null, status: 'failed', note: e.message }; }
    db.prepare('INSERT INTO refunds(payment_id,booking_id,amount,reason,provider_refund_id,status,note) VALUES(?,?,?,?,?,?,?)').run(p.id, bookingId, amt, reason, r.refund_id, r.status, r.note || null);
    if (r.status === 'processed') { db.prepare('UPDATE payments SET refunded=refunded+? WHERE id=?').run(amt, p.id); left = r2(left - amt); refunded = r2(refunded + amt); details.push({ amount: amt, refund_id: r.refund_id, status: 'processed' }); }
    else details.push({ amount: amt, status: 'failed', note: r.note });
  }
  let manual = 0;
  if (left > 0 && opts.allowManual) {
    manual = left; db.prepare("INSERT INTO refunds(payment_id,booking_id,amount,reason,status,note) VALUES(NULL,?,?,?,'manual','Paid outside the gateway - the operator refunds this directly')").run(bookingId, left, reason);
  }
  return { requested: amount, refunded, manual, details };
}
module.exports = { newOrder, applyPaid, refundBooking, grossAdvance, prov };
