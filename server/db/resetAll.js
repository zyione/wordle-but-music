import db from './db.js';
import { scheduleToday } from './scheduleToday.js';
import { fileURLToPath } from 'url';

export function resetAll({ keepUsers = true } = {}) {
  console.log('Resetting all game play history & attempts (preserving table structures and songs database)...');

  db.exec('DELETE FROM guesses');
  db.exec('DELETE FROM attempts');
  db.exec('DELETE FROM puzzles');
  db.exec('DELETE FROM party_scores');
  db.exec('DELETE FROM party_members');
  db.exec('DELETE FROM parties');
  db.exec('DELETE FROM sessions');

  if (!keepUsers) {
    db.exec('DELETE FROM users');
    console.log('Cleared user profiles table.');
  }

  console.log('Game history successfully reset.');

  // Re-schedule today's puzzle
  const rescheduled = scheduleToday();
  console.log('Today\'s puzzle has been rescheduled fresh!');

  return {
    success: true,
    rescheduled
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetAll();
}
