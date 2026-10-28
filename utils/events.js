// Sample calendar of festivals / holidays / sale seasons used by the rush model.
// Fixed-date items work for any year. Floating festival dates are listed for 2026 only and are approximate - verify before relying on them.
const pad = (n) => String(n).padStart(2, '0');
const FIXED = [
  ['01-01', 'New Year’s Day', 'holiday'], ['01-26', 'Republic Day', 'holiday'], ['08-15', 'Independence Day', 'holiday'],
  ['10-02', 'Gandhi Jayanti', 'holiday'], ['11-01', 'Kannada Rajyotsava', 'holiday'], ['12-25', 'Christmas', 'holiday'],
  ['12-31', 'New Year’s Eve', 'festival'], ['02-14', 'Valentine’s Day', 'festival'],
];
const FLOAT = {
  2026: [['03-04', 'Holi', 'holiday'], ['03-19', 'Ugadi', 'holiday'], ['03-21', 'Eid al-Fitr (approx.)', 'holiday'], ['09-14', 'Ganesh Chaturthi', 'holiday'],
    ['10-20', 'Dussehra', 'holiday'], ['11-06', 'Dhanteras', 'festival'], ['11-08', 'Diwali', 'holiday'], ['11-09', 'Diwali holidays', 'festival']],
};
const SALES = [['01-10', '01-26', 'Republic Day sale'], ['06-25', '07-10', 'End-of-season sale'], ['08-08', '08-15', 'Independence Day sale'],
  ['10-15', '11-12', 'Festive season sale'], ['12-20', '12-31', 'Year-end sale']];

const dowOf = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
const addDays = (ymd, n) => { const [y, m, d] = ymd.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };

function raw(ymd) {
  const y = Number(ymd.slice(0, 4)), md = ymd.slice(5);
  const items = [...FIXED, ...(FLOAT[y] || [])].filter((e) => e[0] === md);
  const sale = SALES.find((s) => md >= s[0] && md <= s[1]);
  return { items, sale };
}
const hasHoliday = (ymd) => raw(ymd).items.some((e) => e[2] === 'holiday');
const hasBig = (ymd) => raw(ymd).items.length > 0;

function eventsFor(ymd) {
  const { items, sale } = raw(ymd);
  const names = items.map((e) => e[1]); if (sale) names.push(sale[2]);
  const dow = dowOf(ymd), day = Number(ymd.slice(8));
  const off = (d) => { const w = dowOf(d); return w === 0 || w === 6 || hasHoliday(d); };
  let long = false;
  if (off(ymd)) {
    let a = ymd, b = ymd, hol = hasHoliday(ymd);
    for (let i = 0; i < 4 && off(addDays(a, -1)); i++) { a = addDays(a, -1); hol = hol || hasHoliday(a); }
    for (let i = 0; i < 4 && off(addDays(b, 1)); i++) { b = addDays(b, 1); hol = hol || hasHoliday(b); }
    let run = 1, c = a; while (c !== b) { c = addDays(c, 1); run++; }
    long = run >= 3 && hol;
  }
  return {
    names, holiday: hasHoliday(ymd), festival: items.some((e) => e[2] === 'festival') || (hasHoliday(ymd) && items.length > 0 && !['01-26', '08-15', '10-02'].includes(ymd.slice(5))),
    eve: !hasBig(ymd) && hasBig(addDays(ymd, 1)), sale: !!sale, payday: day >= 28 || day <= 3, long, dow,
  };
}
function listEvents(fromYmd, days) {
  const out = [];
  for (let i = 0; i < days; i++) { const d = addDays(fromYmd, i); const e = raw(d); e.items.forEach((x) => out.push({ date: d, name: x[1], type: x[2] })); }
  return out;
}
module.exports = { eventsFor, listEvents, dowOf, addDays };
