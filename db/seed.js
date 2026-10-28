const bcrypt = require('bcryptjs');
const { generateLayoutV2 } = require('../utils/layout');
const { resolveVehicle } = require('../utils/vehicles');

// Demo facilities (fictional / sample data, approximate area locations) so the app works in several cities.
// In real use a facility only appears where an operator registers it.
const D = (name, address, lat, lng, kind, desc, w, l, rate, cap, max, start = 1) => ({ name, address, lat, lng, kind, desc, w, l, rate, cap, max, start });
const DEMO = [
  D('Janpath Plaza Parking', 'Janpath, New Delhi', 28.6254, 77.2189, 'garage', 'Covered parking close to Janpath market.', 40, 30, 40, 300, 14),
  D('Connaught Court Garage', 'Connaught Place, New Delhi', 28.6322, 77.2195, 'garage', 'Central garage for shoppers and office-goers.', 36, 28, 60, 400, 10),
  D('Karol Bagh Open Ground', 'Karol Bagh, New Delhi', 28.6514, 77.1907, 'open_ground', 'Open ground - five spaces allocated to Marga.', 30, 24, 20, 150, 5, 31),
  D('Saket Mall Lot', 'Saket, New Delhi', 28.5285, 77.2190, 'mall', 'Mall visitor parking.', 40, 30, 50, 350, 12),
  D('MG Road Central Parking', 'MG Road, Bengaluru', 12.9756, 77.6068, 'garage', 'Covered parking for MG Road offices and shops.', 40, 30, 50, 350, 12),
  D('Indiranagar Open Lot', '100 Feet Road, Indiranagar, Bengaluru', 12.9719, 77.6412, 'open_ground', 'Open lot near restaurants and cafes.', 36, 28, 30, 220, 10),
  D('Koramangala Mall Parking', 'Koramangala, Bengaluru', 12.9345, 77.6112, 'mall', 'Shopping mall visitor parking.', 40, 30, 40, 300, 14),
  D('Bandra Linking Road Garage', 'Linking Road, Bandra, Mumbai', 19.0654, 72.8340, 'garage', 'Garage near the Linking Road shopping street.', 36, 28, 80, 500, 10),
  D('Churchgate Station Lot', 'Churchgate, Mumbai', 18.9350, 72.8275, 'garage', 'Parking close to Churchgate station.', 36, 28, 70, 450, 10),
  D('Banjara Hills Plaza Parking', 'Banjara Hills, Hyderabad', 17.4126, 78.4482, 'mall', 'Plaza and restaurant parking.', 40, 30, 40, 300, 12),
  D('HITEC City Tech Park Garage', 'HITEC City, Hyderabad', 17.4435, 78.3772, 'garage', 'Garage for tech park visitors.', 40, 30, 35, 280, 14),
  D('T Nagar Pondy Bazaar Parking', 'T Nagar, Chennai', 13.0418, 80.2341, 'garage', 'Parking for the T Nagar shopping district.', 36, 28, 30, 220, 10),
  D('FC Road Open Ground', 'FC Road, Pune', 18.5236, 73.8410, 'open_ground', 'Open ground near Fergusson College Road.', 36, 28, 20, 150, 10),
  D('Park Street Parking Plaza', 'Park Street, Kolkata', 22.5535, 88.3520, 'garage', 'Parking near Park Street restaurants.', 36, 28, 40, 300, 10),
];
// Large mall example used for the rush-forecast demo: bigger parking area, entry at the bottom, exit on the right, EV / accessible / covered slots
const ORION = { ...D('Orion Mall Parking (Demo)', 'Dr Rajkumar Rd, Rajajinagar, Bengaluru', 13.0110, 77.5552, 'mall',
  'Large mall basement parking. Sample data is used for the rush-forecast demo.', 100, 70, 40, 350, 250),
  entry: ['bottom', 0.3], exit: ['right', 0.75], ev: 16, accessible: 10, covered: 'all', height: 2.1, dynamic: true };

function addFacility(db, ownerId, d) {
  const id = db.prepare(`INSERT INTO facilities
    (owner_id,name,address,lat,lng,kind,description,open_time,close_time,width_m,length_m,layout_status,verification_status,authority_note,upi_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ownerId, d.name, d.address, d.lat, d.lng, d.kind, d.desc, '06:00', '23:00', d.w, d.l, 'published', 'approved', 'Demo data - verified', 'marga.demo@upi').lastInsertRowid;
  db.prepare('INSERT INTO tariffs(facility_id,hourly_rate,min_charge,grace_minutes,daily_cap) VALUES(?,?,?,?,?)').run(id, d.rate, 20, 10, d.cap);
  const entry = d.entry || ['bottom', 0.5], exit = d.exit || null;
  const out = generateLayoutV2({ width: d.w, length: d.l, vehicle: 'car', maxSlots: d.max, startNumber: d.start,
    entry: { side: entry[0], pos: entry[1] }, exit: exit ? { side: exit[0], pos: exit[1] } : null,
    ev: d.ev, accessible: d.accessible, covered: d.covered || (d.kind === 'garage' ? 'all' : d.kind === 'mall' ? 'half' : 'none'), height: d.height });
  const ins = db.prepare('INSERT INTO slots(facility_id,label,x,y,w,h,vehicle_type,ev,covered,accessible,max_height) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
  out.slots.forEach((s) => ins.run(id, s.label, s.x, s.y, s.w, s.h, s.vehicle_type, s.ev, s.covered, s.accessible, s.max_height));
  db.prepare('UPDATE facilities SET entry_side=?, entry_pos=?, exit_side=?, exit_pos=?, layout_v=2, height_limit_m=?, covered_mode=?, dynamic_pricing=?, surge_max_pct=25, discount_max_pct=20 WHERE id=?')
    .run(entry[0], entry[1], exit ? exit[0] : null, exit ? exit[1] : null, d.height || null, d.covered || null, d.dynamic ? 1 : 0, id);
  return id;
}

function ensureDemo(db) {
  const op = db.prepare("SELECT id FROM users WHERE email='operator@marga.app'").get();
  if (!op) return 0;
  const exists = db.prepare('SELECT 1 FROM facilities WHERE name=?');
  let n = 0;
  db.transaction(() => {
    for (const d of DEMO) if (!exists.get(d.name)) { addFacility(db, op.id, d); n++; }
    if (!exists.get('Lajpat Nagar Community Ground')) {   // waiting for admin verification
      const p = db.prepare(`INSERT INTO facilities(owner_id,name,address,lat,lng,kind,description,open_time,close_time,layout_status,verification_status,authority_note,upi_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(op.id, 'Lajpat Nagar Community Ground', 'Lajpat Nagar, New Delhi', 28.5677, 77.2433, 'open_ground',
        'Open ground awaiting verification.', '08:00', '22:00', 'none', 'pending', 'Owned by the resident welfare association; permission letter available.', 'marga.demo@upi').lastInsertRowid;
      db.prepare('INSERT INTO tariffs(facility_id,hourly_rate,min_charge,grace_minutes,daily_cap) VALUES(?,?,?,?,?)').run(p, 25, 20, 10, 200);
    }
  })();
  if (!exists.get(ORION.name)) {
    const ml = require('../utils/mlrush');
    const id = db.transaction(() => addFacility(db, op.id, ORION))();
    ml.generateSample(id, 150);
    ml.train(id);
    n++;
  }
  ensureExtras(db);
  return n;
}

function ensureExtras(db) {
  // vehicles saved by older versions get a typical size for their type
  db.prepare('SELECT id, type FROM vehicles WHERE width_m IS NULL').all().forEach((v) => {
    const r = resolveVehicle('', v.type);
    db.prepare('UPDATE vehicles SET width_m=?, length_m=?, height_m=? WHERE id=?').run(r.w, r.l, r.h, v.id);
  });
  // a few sample reviews so the rating display has something to show
  if (db.prepare('SELECT COUNT(*) c FROM reviews').get().c === 0) {
    let u = db.prepare("SELECT id FROM users WHERE email='reviewer@marga.app'").get();
    if (!u) u = { id: db.prepare("INSERT INTO users(name,email,phone,password_hash,role) VALUES('Sample Reviewer','reviewer@marga.app','','x','driver')").run().lastInsertRowid };
    const add = db.prepare('INSERT INTO reviews(facility_id,user_id,rating,comment) VALUES(?,?,?,?)');
    const R = [['Orion Mall Parking (Demo)', 5, 'Huge basement and my slot was easy to find with the drive guide.'], ['Orion Mall Parking (Demo)', 4, 'Very crowded on Saturday evening, but booking ahead saved me a lot of time.'],
      ['Orion Mall Parking (Demo)', 5, 'EV charging slots were free and close to the entry.'], ['Orion Mall Parking (Demo)', 3, 'The busy-time price was a bit high, but fair for a festival weekend.'],
      ['Janpath Plaza Parking', 4, 'Clean and covered. Exit was quick.'], ['Janpath Plaza Parking', 5, 'Good staff, no confusion about slots.'],
      ['MG Road Central Parking', 4, 'Close to everything on MG Road.'], ['Saket Mall Lot', 3, 'A little tight for my SUV.'], ['Connaught Court Garage', 4, 'Pricey but convenient.']];
    R.forEach(([name, rating, comment]) => { const f = db.prepare('SELECT id FROM facilities WHERE name=?').get(name); if (f) add.run(f.id, u.id, rating, comment); });
  }
}

function seed(db) {
  const hash = (p) => bcrypt.hashSync(p, 10);
  const addUser = db.prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)');
  addUser.run('Marga Admin', 'admin@marga.app', '9000000000', hash('Admin@123'), 'admin');
  addUser.run('Demo Operator', 'operator@marga.app', '9000000001', hash('Operator@123'), 'operator');
  const dr = addUser.run('Demo Driver', 'driver@marga.app', '9000000002', hash('Driver@123'), 'driver').lastInsertRowid;
  const addVeh = db.prepare('INSERT INTO vehicles(user_id,reg_no,type,label,brand,model,width_m,length_m,height_m,is_ev) VALUES(?,?,?,?,?,?,?,?,?,?)');
  [['DL01AB1234', 'car', 'My Swift', 'Maruti Suzuki Swift'], ['DL05XY9876', 'bike', 'Scooter', 'Honda Activa']].forEach(([reg, type, label, text]) => {
    const r = resolveVehicle(text, type); addVeh.run(dr, reg, r.type, label, r.brand, r.model, r.w, r.l, r.h, r.ev ? 1 : 0);
  });
  ensureDemo(db);
}
module.exports = seed;
module.exports.ensureDemo = ensureDemo;
