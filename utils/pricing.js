// Fee = time parked x hourly rate (pro-rated by the minute)
// grace period -> free; then minimum charge applies; daily cap limits each 24h block. Rounded to whole rupees.
function calcFee(minutes, t) {
  if (minutes <= (t.grace_minutes || 0)) return 0;
  const DAY = 1440;
  const fullDays = Math.floor(minutes / DAY);
  const rem = minutes - fullDays * DAY;
  const part = (m) => (m <= 0 ? 0 : Math.max(t.min_charge || 0, (m / 60) * t.hourly_rate));
  let remFee = part(rem);
  if (t.daily_cap) remFee = Math.min(remFee, t.daily_cap);
  const dayFee = t.daily_cap || 24 * t.hourly_rate;
  return Math.round(fullDays * dayFee + remFee);
}
module.exports = { calcFee };
