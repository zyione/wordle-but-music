import express from 'express';
import db from '../db/db.js';
import { fetchTrackMetadata } from '../services/deezerClient.js';

const router = express.Router();

// GET all songs
router.get('/admin/songs', (req, res) => {
  try {
    const songs = db.prepare('SELECT * FROM songs ORDER BY title ASC').all();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// POST add song via Deezer lookup
router.post('/admin/songs', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: 'title and artist are required' });
    }

    const meta = await fetchTrackMetadata(title, artist);
    if (!meta) {
      return res.status(404).json({ error: `Could not find preview clip for "${title}" by ${artist} on Deezer.` });
    }

    const stmt = db.prepare(`
      INSERT INTO songs (title, artist, album, artwork_url, preview_url, source, source_track_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_track_id) DO UPDATE SET
        title = excluded.title,
        artist = excluded.artist,
        album = excluded.album,
        artwork_url = excluded.artwork_url,
        preview_url = excluded.preview_url
      RETURNING *
    `);

    const song = stmt.get(
      meta.title,
      meta.artist,
      meta.album,
      meta.artwork_url,
      meta.preview_url,
      meta.source,
      meta.source_track_id
    );

    res.json({ message: 'Song added successfully', song });
  } catch (error) {
    console.error('Error adding song:', error);
    res.status(500).json({ error: 'Failed to add song' });
  }
});

// POST schedule puzzle
router.post('/admin/puzzle', (req, res) => {
  try {
    const { date, songId } = req.body;
    if (!date || !songId) {
      return res.status(400).json({ error: 'date (YYYY-MM-DD) and songId are required' });
    }

    const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    db.prepare(`
      INSERT INTO puzzles (puzzle_date, song_id)
      VALUES (?, ?)
      ON CONFLICT(puzzle_date) DO UPDATE SET song_id = excluded.song_id
    `).run(date, songId);

    res.json({ message: `Puzzle scheduled for ${date}`, songId });
  } catch (error) {
    console.error('Error scheduling puzzle:', error);
    res.status(500).json({ error: 'Failed to schedule puzzle' });
  }
});

export default router;
