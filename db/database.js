const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const file = process.env.DB_FILE || path.join(__dirname, 'marga.db');
const open = () => { const d = new Database(file); d.pragma('journal_mode = WAL'); d.pragma('foreign_keys = ON'); return d; };
let db = open();

// An older database (from a previous version of this project) is backed up and replaced, never edited in place
const hasTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='facilities'").get();
if (hasTable && !db.prepare('PRAGMA table_info(facilities)').all().some((c) => c.name === 'upi_id')) {
  db.close();
  const backup = file.replace(/\.db$/, `.backup-${Date.now()}.db`);
  fs.renameSync(file, backup);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(file + ext)) fs.rmSync(file + ext);
  console.log('Old database found - backed up as', path.basename(backup), 'and a fresh one created.');
  db = open();
}

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// Add new columns to existing tables (keeps all existing data)
const addCols = (table, cols) => {
  const have = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  for (const [c, def] of Object.entries(cols)) if (!have.includes(c)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${c} ${def}`);
};
addCols('vehicles', { brand: 'TEXT', model: 'TEXT', width_m: 'REAL', length_m: 'REAL', height_m: 'REAL', is_ev: 'INTEGER DEFAULT 0' });
addCols('slots', { ev: 'INTEGER DEFAULT 0', covered: 'INTEGER DEFAULT 0', accessible: 'INTEGER DEFAULT 0', max_height: 'REAL' });
addCols('facilities', { entry_side: "TEXT DEFAULT 'bottom'", entry_pos: 'REAL DEFAULT 0.5', exit_side: 'TEXT', exit_pos: 'REAL', layout_v: 'INTEGER DEFAULT 1',
  height_limit_m: 'REAL', covered_mode: 'TEXT', dynamic_pricing: 'INTEGER DEFAULT 0', surge_max_pct: 'REAL DEFAULT 25', discount_max_pct: 'REAL DEFAULT 20' });
addCols('bookings', { rate_multiplier: 'REAL DEFAULT 1', advance_amount: 'REAL DEFAULT 0' });

module.exports = db;   // exported early: modules used while seeding may require this file
const seed = require('./seed');
if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0) { seed(db); console.log('Database seeded with demo data.'); }
else { const n = seed.ensureDemo(db); if (n) console.log(`Added ${n} demo facilities.`); }

module.exports = db;
