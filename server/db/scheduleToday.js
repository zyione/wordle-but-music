import db from './db.js';
import { fileURLToPath } from 'url';

export function scheduleToday() {
  const today = new Date().toISOString().split('T')[0];

  // Check if today already has a puzzle
  const existing = db.prepare('SELECT * FROM puzzles WHERE puzzle_date = ?').get(today);
  if (existing) {
    console.log(`Today's puzzle already exists (ID: ${existing.id}, Song ID: ${existing.song_id}).`);
    return existing;
  }

  // Find an unused song
  const unusedSong = db.prepare(`
    SELECT s.id, s.title, s.artist
    FROM songs s
    LEFT JOIN puzzles p ON s.id = p.song_id
    WHERE p.id IS NULL
    ORDER BY RANDOM()
    LIMIT 1
  `).get();

  let selectedSong = unusedSong;
  if (!selectedSong) {
    // If all songs have been used, pick any random song
    selectedSong = db.prepare('SELECT id, title, artist FROM songs ORDER BY RANDOM() LIMIT 1').get();
  }

  if (!selectedSong) {
    console.warn('No songs available in database to schedule a puzzle!');
    return null;
  }

  const result = db.prepare('INSERT INTO puzzles (puzzle_date, song_id) VALUES (?, ?)').run(today, selectedSong.id);
  console.log(`Scheduled today's puzzle (${today}): "${selectedSong.title}" by ${selectedSong.artist} (Puzzle ID: ${result.lastInsertRowid})`);

  return {
    id: result.lastInsertRowid,
    puzzle_date: today,
    song_id: selectedSong.id
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scheduleToday();
}
