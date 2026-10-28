// Payment gateway layer. Razorpay when RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are set, otherwise a built-in
// test gateway that follows the SAME order -> payment -> signature -> verify flow (no real money moves).
const crypto = require('crypto');
const KEY_ID = process.env.RAZORPAY_KEY_ID || '', KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const LIVE = !!(KEY_ID && KEY_SECRET);
const MOCK_SECRET = process.env.MOCK_PAYMENT_SECRET || 'marga-mock-secret';
const hmac = (data, key) => crypto.createHmac('sha256', key).update(data).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const rid = (p) => p + crypto.randomBytes(7).toString('hex');

async function rp(path, body) {
  const r = await fetch('https://api.razorpay.com/v1' + path, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(KEY_ID + ':' + KEY_SECRET).toString('base64') }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.description) || 'Payment gateway error');
  return d;
}
async function createOrder({ amount, receipt, notes }) {
  if (LIVE) { const o = await rp('/orders', { amount: Math.round(amount * 100), currency: 'INR', receipt, notes }); return { order_id: o.id, provider: 'razorpay' }; }
  return { order_id: rid('order_MOCK'), provider: 'mock' };
}
// Razorpay: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  return safeEq(hmac(`${orderId}|${paymentId}`, LIVE ? KEY_SECRET : MOCK_SECRET), signature);
}
function mockPay(orderId) { const p = rid('pay_MOCK'); return { razorpay_order_id: orderId, razorpay_payment_id: p, razorpay_signature: hmac(`${orderId}|${p}`, MOCK_SECRET) }; }
async function refund(paymentId, amount, notes) {
  if (LIVE && !String(paymentId).startsWith('pay_MOCK')) {
    const r = await rp(`/payments/${paymentId}/refund`, { amount: Math.round(amount * 100), notes });
    return { refund_id: r.id, status: r.status === 'failed' ? 'failed' : 'processed' };
  }
  return { refund_id: rid('rfnd_MOCK'), status: 'processed' };
}
function verifyWebhook(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  return safeEq(hmac(rawBody, secret), signature);
}
module.exports = { LIVE, KEY_ID, createOrder, verifySignature, mockPay, refund, verifyWebhook, hmac };
