import db from './db.js';
import { scheduleToday } from './scheduleToday.js';
import { fileURLToPath } from 'url';

export function resetToday() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Resetting attempts for today's puzzle (${today})...`);

  const puzzle = db.prepare('SELECT id FROM puzzles WHERE puzzle_date = ?').get(today);

  if (puzzle) {
    // Delete guesses & attempts associated with today's puzzle
    const attempts = db.prepare('SELECT id FROM attempts WHERE puzzle_id = ?').all(puzzle.id);
    for (const att of attempts) {
      db.prepare('DELETE FROM guesses WHERE attempt_id = ?').run(att.id);
    }
    db.prepare('DELETE FROM attempts WHERE puzzle_id = ?').run(puzzle.id);
    console.log(`Cleared ${attempts.length} attempts for today's puzzle.`);
  } else {
    console.log(`No scheduled puzzle found for today (${today}). Scheduling new puzzle...`);
  }

  const rescheduled = scheduleToday();
  console.log('Today\'s puzzle is ready to play fresh!');

  return {
    today,
    rescheduled
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  resetToday();
}
