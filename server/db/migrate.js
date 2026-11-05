import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { hashPin } from '../services/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function migrate() {
  console.log('Running database migrations...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Safe migration additions for existing databases
  const alterColumns = [
    { table: 'attempts', col: 'score', type: 'INTEGER DEFAULT 0' },
    { table: 'attempts', col: 'time_taken_ms', type: 'INTEGER DEFAULT 0' },
    { table: 'attempts', col: 'skips_used', type: 'INTEGER DEFAULT 0' },
    { table: 'attempts', col: 'wrong_guesses', type: 'INTEGER DEFAULT 0' },
    { table: 'users', col: 'pin', type: 'TEXT' }
  ];

  for (const { table, col, type } of alterColumns) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    } catch {
      // Column already exists, ignore error
    }
  }

  db.transaction(() => {
    for (const user of db.prepare("SELECT id, pin FROM users WHERE pin IS NOT NULL AND pin NOT LIKE 'scrypt$%'").all()) {
      db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(hashPin(user.pin), user.id);
    }
    db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(Date.now());
  });
  console.log('Migrations completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
}
