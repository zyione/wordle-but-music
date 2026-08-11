import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { calculateScore } from '../services/scoring.js';

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

  // Backfill scores for existing solved attempts created before scoring update
  try {
    const solvedWithoutScore = db.prepare('SELECT id, guesses_used, time_taken_ms FROM attempts WHERE is_solved = 1 AND (score = 0 OR score IS NULL)').all();
    for (const att of solvedWithoutScore) {
      const computed = calculateScore({ isSolved: true, guessNumber: att.guesses_used || 1, timeTakenMs: att.time_taken_ms || 10000 });
      db.prepare('UPDATE attempts SET score = ? WHERE id = ?').run(computed, att.id);
    }
  } catch (err) {
    console.warn('Backfill score warning:', err.message);
  }

  console.log('Migrations completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate();
}
