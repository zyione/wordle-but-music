import express from 'express';
import db from '../db/db.js';
import fuzzysort from 'fuzzysort';

const router = express.Router();

router.get('/search', (req, res) => {
  try {
    const query = (req.query.q || '').toString().trim();
    if (!query) {
      return res.json([]);
    }

    // Fetch candidate songs from local DB
    const allSongs = db.prepare('SELECT id, title, artist, album, artwork_url FROM songs').all();

    // Use fuzzysort for fast fuzzy matching across title & artist
    const results = fuzzysort.go(query, allSongs, {
      keys: ['title', 'artist'],
      threshold: -10000,
      limit: 10
    });

    const matches = results.map((res) => res.obj);

    // Fallback SQL LIKE search if fuzzysort yielded few results
    if (matches.length < 5) {
      const sqlMatches = db.prepare(`
        SELECT id, title, artist, album, artwork_url
        FROM songs
        WHERE title LIKE ? OR artist LIKE ?
        LIMIT 10
      `).all(`%${query}%`, `%${query}%`);

      const existingIds = new Set(matches.map((m) => m.id));
      for (const song of sqlMatches) {
        if (!existingIds.has(song.id)) {
          matches.push(song);
          existingIds.add(song.id);
        }
      }
    }

    res.json(matches.slice(0, 10));
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
