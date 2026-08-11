import db from './db.js';
import { fileURLToPath } from 'url';

/**
 * Deterministic string hash (Mulberry/djb2 style)
 * Converts date string "YYYY-MM-DD" to a fixed positive integer.
 */
function hashDateString(dateStr) {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function scheduleToday() {
  const today = new Date().toISOString().split('T')[0];

  // Check if today already has a scheduled puzzle
  const existing = db.prepare('SELECT * FROM puzzles WHERE puzzle_date = ?').get(today);
  if (existing) {
    const existingSong = db.prepare('SELECT title, artist FROM songs WHERE id = ?').get(existing.song_id);
    console.log(`Today's puzzle (${today}) is fixed to: "${existingSong?.title}" by ${existingSong?.artist} (ID: ${existing.id}, Song ID: ${existing.song_id}).`);
    return existing;
  }

  // Retrieve curated English Pop Hits pool (seed tracks 1-50)
  const popSongs = db.prepare(`
    SELECT id, title, artist
    FROM songs
    WHERE id <= 50 OR source_track_id LIKE 'seed_%'
    ORDER BY id ASC
  `).all();

  let selectedSong = null;

  if (popSongs.length > 0) {
    // Deterministic index calculation guarantees identical daily song for everyone on any given date
    const dailyIndex = hashDateString(today) % popSongs.length;
    selectedSong = popSongs[dailyIndex];
  } else {
    // Fallback if seed list is empty
    selectedSong = db.prepare('SELECT id, title, artist FROM songs ORDER BY id ASC LIMIT 1').get();
  }

  if (!selectedSong) {
    console.warn('No pop songs available in database to schedule a puzzle!');
    return null;
  }

  const result = db.prepare('INSERT INTO puzzles (puzzle_date, song_id) VALUES (?, ?)').run(today, selectedSong.id);
  console.log(`Scheduled fixed daily puzzle (${today}): "${selectedSong.title}" by ${selectedSong.artist} (Puzzle ID: ${result.lastInsertRowid})`);

  return {
    id: result.lastInsertRowid,
    puzzle_date: today,
    song_id: selectedSong.id
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  scheduleToday();
}
