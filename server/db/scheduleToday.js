import db from './db.js';
import { pickSong } from '../services/randomSongs.js';
import { fileURLToPath } from 'url';

export function scheduleToday() {
  const today = new Date().toISOString().split('T')[0];

  // Check if today already has a scheduled puzzle
  const existing = db.prepare('SELECT * FROM puzzles WHERE puzzle_date = ?').get(today);
  if (existing) {
    const existingSong = db.prepare('SELECT title, artist FROM songs WHERE id = ?').get(existing.song_id);
    console.log(`Today's puzzle (${today}) is fixed to: "${existingSong?.title}" by ${existingSong?.artist} (ID: ${existing.id}, Song ID: ${existing.song_id}).`);
    return existing;
  }

  const songs = db.prepare("SELECT id, title, artist, preview_url FROM songs WHERE preview_url <> ''").all();
  const history = db.prepare('SELECT song_id FROM puzzles WHERE puzzle_date < ? ORDER BY puzzle_date DESC LIMIT ?').all(today, Math.max(0, songs.length - 1)).reverse().map(p => p.song_id);
  const { song: selectedSong } = pickSong(songs, history);

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
