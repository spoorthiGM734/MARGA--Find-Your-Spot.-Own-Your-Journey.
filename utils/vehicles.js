// Vehicle size lookup: the driver only types brand/model; the app works out width, length and height.
// Sizes are approximate manufacturer dimensions in metres (width, length, height).
const RAW = [
  ['Maruti Suzuki','Alto K10','car',1.490,3.530,1.520],['Maruti Suzuki','S-Presso','car',1.490,3.565,1.564],['Maruti Suzuki','WagonR','car',1.475,3.655,1.675],
  ['Maruti Suzuki','Celerio','car',1.655,3.695,1.555],['Maruti Suzuki','Swift','car',1.735,3.845,1.530],['Maruti Suzuki','Dzire','car',1.735,3.995,1.515],
  ['Maruti Suzuki','Baleno','car',1.745,3.990,1.500],['Maruti Suzuki','Ertiga','suv',1.735,4.395,1.690],['Maruti Suzuki','Brezza','suv',1.790,3.995,1.685],
  ['Maruti Suzuki','Fronx','suv',1.765,3.995,1.550],['Maruti Suzuki','Grand Vitara','suv',1.795,4.345,1.645],['Maruti Suzuki','Jimny','suv',1.645,3.985,1.720],
  ['Maruti Suzuki','Invicto','suv',1.850,4.755,1.795],
  ['Hyundai','Grand i10 Nios','car',1.680,3.805,1.520],['Hyundai','i20','car',1.775,3.995,1.505],['Hyundai','Aura','car',1.680,3.995,1.520],
  ['Hyundai','Verna','car',1.765,4.535,1.475],['Hyundai','Exter','suv',1.680,3.815,1.631],['Hyundai','Venue','suv',1.770,3.995,1.617],
  ['Hyundai','Creta','suv',1.790,4.330,1.635],['Hyundai','Alcazar','suv',1.790,4.500,1.675],['Hyundai','Tucson','suv',1.865,4.630,1.665],
  ['Tata','Tiago','car',1.677,3.765,1.535],['Tata','Tigor','car',1.677,3.993,1.532],['Tata','Altroz','car',1.755,3.990,1.523],
  ['Tata','Punch','suv',1.742,3.827,1.615],['Tata','Nexon','suv',1.811,3.995,1.620],['Tata','Curvv','suv',1.810,4.308,1.630],
  ['Tata','Harrier','suv',1.922,4.605,1.718],['Tata','Safari','suv',1.922,4.668,1.795],
  ['Tata','Tiago EV','car',1.677,3.769,1.536,1],['Tata','Nexon EV','suv',1.811,3.994,1.616,1],['Tata','Punch EV','suv',1.742,3.857,1.633,1],
  ['Mahindra','Thar','suv',1.820,3.985,1.855],['Mahindra','Bolero','suv',1.745,3.995,1.880],['Mahindra','XUV300','suv',1.821,3.995,1.627],
  ['Mahindra','Scorpio N','suv',1.917,4.662,1.870],['Mahindra','Scorpio Classic','suv',1.820,4.456,1.995],['Mahindra','XUV700','suv',1.890,4.695,1.755],
  ['Mahindra','Marazzo','suv',1.850,4.585,1.750],['Mahindra','XUV400','suv',1.821,4.200,1.634,1],
  ['Toyota','Glanza','car',1.745,3.990,1.500],['Toyota','Etios','car',1.695,4.265,1.510],['Toyota','Urban Cruiser Hyryder','suv',1.795,4.365,1.645],
  ['Toyota','Innova Crysta','suv',1.830,4.735,1.795],['Toyota','Innova Hycross','suv',1.850,4.755,1.790],['Toyota','Fortuner','suv',1.855,4.795,1.835],
  ['Toyota','Camry','car',1.840,4.885,1.445],
  ['Honda','Amaze','car',1.695,3.995,1.500],['Honda','Jazz','car',1.694,3.955,1.544],['Honda','City','car',1.748,4.549,1.489],
  ['Honda','Elevate','suv',1.790,4.312,1.650],
  ['Kia','Sonet','suv',1.790,3.995,1.642],['Kia','Seltos','suv',1.800,4.365,1.645],['Kia','Carens','suv',1.800,4.540,1.708],['Kia','EV6','suv',1.880,4.695,1.550,1],
  ['MG','Comet EV','car',1.505,2.974,1.640,1],['MG','Astor','suv',1.809,4.323,1.650],['MG','Hector','suv',1.835,4.655,1.760],
  ['MG','ZS EV','suv',1.809,4.314,1.620,1],['MG','Windsor EV','suv',1.850,4.295,1.677,1],
  ['Renault','Kwid','car',1.579,3.731,1.490],['Renault','Triber','car',1.739,3.990,1.643],['Renault','Kiger','suv',1.750,3.991,1.605],
  ['Nissan','Magnite','suv',1.757,3.994,1.572],['Citroen','C3','car',1.733,3.981,1.586],
  ['Volkswagen','Polo','car',1.682,3.971,1.469],['Volkswagen','Virtus','car',1.752,4.561,1.507],['Volkswagen','Taigun','suv',1.760,4.221,1.612],
  ['Volkswagen','Tiguan','suv',1.839,4.509,1.656],['Skoda','Slavia','car',1.752,4.541,1.507],['Skoda','Kushaq','suv',1.760,4.225,1.612],
  ['Skoda','Octavia','car',1.829,4.689,1.470],['Jeep','Compass','suv',1.819,4.405,1.640],['Ford','EcoSport','suv',1.765,3.998,1.647],
  ['BMW','3 Series','car',1.827,4.709,1.442],['BMW','X1','suv',1.845,4.500,1.642],['Mercedes-Benz','C-Class','car',1.820,4.751,1.438],
  ['Audi','A4','car',1.847,4.762,1.427],['Audi','Q3','suv',1.849,4.484,1.616],['BYD','Atto 3','suv',1.875,4.455,1.615,1],
  ['Hero','Splendor','bike',0.720,1.985,1.105],['Hero','HF Deluxe','bike',0.720,1.965,1.045],['Honda','Activa','bike',0.710,1.833,1.150],
  ['Honda','Shine','bike',0.785,2.046,1.100],['Bajaj','Pulsar','bike',0.780,2.055,1.060],['Bajaj','Chetak','bike',0.725,1.875,1.145,1],
  ['Royal Enfield','Classic 350','bike',0.800,2.145,1.090],['Royal Enfield','Bullet 350','bike',0.800,2.180,1.100],['Royal Enfield','Hunter 350','bike',0.800,2.055,1.055],
  ['TVS','Jupiter','bike',0.665,1.848,1.145],['TVS','Apache','bike',0.730,2.050,1.105],['Yamaha','FZ','bike',0.780,1.995,1.080],
  ['Suzuki','Access','bike',0.700,1.860,1.160],['KTM','Duke','bike',0.835,2.000,1.150],['Ola','S1','bike',0.700,1.860,1.160,1],['Ather','450','bike',0.700,1.800,1.140,1],
];
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ALIASES = { maruti: 'maruti suzuki', suzuki: 'maruti suzuki', merc: 'mercedes benz', mercedes: 'mercedes benz', vw: 'volkswagen', 're': 'royal enfield', enfield: 'royal enfield' };
const MODELS = RAW.map(([brand, model, type, w, l, h, ev]) => ({ brand, model, type, w, l, h, ev: !!ev, mk: norm(model), bk: norm(brand) }));
const DEFAULTS = { car: { w: 1.75, l: 4.1, h: 1.55 }, suv: { w: 1.85, l: 4.5, h: 1.70 }, bike: { w: 0.76, l: 1.98, h: 1.10 } };
const classOf = (type) => (type === 'bike' ? ['bike'] : ['car', 'suv']);
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

// The brand/model decides the type: if the text is not a model of the selected kind of vehicle, the other kind is tried too
function resolveVehicle(text, type) {
  type = ['car', 'suv', 'bike'].includes(type) ? type : 'car';
  const r = resolveIn(text, type);
  if (r.matched || !String(text || '').trim()) return r;
  const r2 = resolveIn(text, type === 'bike' ? 'car' : 'bike');
  return r2.matched ? r2 : r;
}
function resolveIn(text, type) {
  let t = norm(text); const classes = classOf(type);
  Object.entries(ALIASES).forEach(([a, b]) => { t = t.replace(new RegExp(`\\b${a}\\b`), b); });
  const ev = /\b(ev|electric)\b/.test(t);
  if (!t) return { matched: false, type, ...DEFAULTS[type], ev: false, brand: null, model: null, note: `No model entered - a typical ${type === 'suv' ? 'SUV' : type} size is used.` };
  const toks = t.split(' ');
  let best = null, bs = 0;
  for (const m of MODELS) {
    if (!classes.includes(m.type)) continue;
    const mt = m.mk.split(' ');
    let s = 0;
    if ((' ' + t + ' ').includes(' ' + m.mk + ' ')) s = 10 + (mt.length > 1 ? 2 : 0);
    else { const hit = mt.filter((x) => toks.includes(x)).length; if (hit === mt.length) s = 8; else if (mt[0].length >= 5 && toks.includes(mt[0])) s = 7; else if (hit > 0 && mt.length > 1) s = 2 * hit; }
    if (!s) continue;
    if ((' ' + t + ' ').includes(' ' + m.bk + ' ')) s += 4;
    if (s > bs) { bs = s; best = m; }
  }
  if (best && bs >= 7) return { matched: true, brand: best.brand, model: best.model, type: best.type, w: best.w, l: best.l, h: best.h, ev: best.ev || ev, note: `Recognised ${best.brand} ${best.model} - size set automatically.` };
  const brand = [...new Set(MODELS.map((m) => m.bk))].find((b) => (' ' + t + ' ').includes(' ' + b + ' '));
  if (brand) {
    const list = MODELS.filter((m) => m.bk === brand && classes.includes(m.type));
    if (list.length) return { matched: false, brand: list[0].brand, model: null, type, w: median(list.map((m) => m.w)), l: median(list.map((m) => m.l)), h: median(list.map((m) => m.h)), ev, note: `Brand recognised, model not found - typical ${list[0].brand} size used.` };
  }
  return { matched: false, brand: null, model: null, type, ...DEFAULTS[type], ev, note: 'Model not recognised - a typical size for this vehicle type is used.' };
}

function suggest(q, type) {
  const t = norm(q); if (t.length < 1) return [];
  const classes = classOf(type);
  return MODELS.filter((m) => classes.includes(m.type) && norm(m.brand + ' ' + m.model).includes(t)).slice(0, 8).map((m) => `${m.brand} ${m.model}`);
}
module.exports = { resolveVehicle, suggest, DEFAULTS, MODELS };
