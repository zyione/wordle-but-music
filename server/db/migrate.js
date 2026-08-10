import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function migrate() {
  console.log('Running database migrations...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Safe migration additions for existing databases
  const alterColumns = [
    { col: 'score', type: 'INTEGER DEFAULT 0' },
    { col: 'time_taken_ms', type: 'INTEGER DEFAULT 0' },
    { col: 'skips_used', type: 'INTEGER DEFAULT 0' },
    { col: 'wrong_guesses', type: 'INTEGER DEFAULT 0' }
  ];

  for (const { col, type } of alterColumns) {
    try {
      db.exec(`ALTER TABLE attempts ADD COLUMN ${col} ${type}`);
    } catch {
      // Column already exists, ignore error
    }
  }

  console.log('Migrations completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
}
