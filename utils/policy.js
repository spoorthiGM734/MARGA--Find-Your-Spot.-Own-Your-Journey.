// Cancellation & refund rules (applies to the booking fee paid in advance)
const FULL_MIN = 60, PARTIAL_PCT = 50;
const RULES = [
  `Cancel at least ${FULL_MIN} minutes before your start time: 100% of the booking fee is refunded.`,
  `Cancel less than ${FULL_MIN} minutes before your start time: ${PARTIAL_PCT}% is refunded.`,
  'After the start time, or if you do not arrive (no-show): the booking fee is not refunded - it is used up.',
  'If the operator cancels or the facility cannot give you your slot: 100% is refunded.',
  'If you park for less time than the booking fee covers, the unused part of the fee is refunded after check-out.',
];
function refundPct(startIso, byOperator = false, now = Date.now()) {
  if (byOperator) return 100;
  const mins = (new Date(startIso).getTime() - now) / 60000;
  return mins >= FULL_MIN ? 100 : mins >= 0 ? PARTIAL_PCT : 0;
}
module.exports = { RULES, refundPct, FULL_MIN, PARTIAL_PCT };
