import express from 'express';
import { createRun, publicPuzzle } from '../services/gameEngine.js';
import { pickSong, parseSongIds } from '../services/randomSongs.js';
import db from '../db/db.js';
import { createImport, ownedImport } from '../services/playlistImports.js';

const router = express.Router();



router.post('/spotify/import', (req, res) => {
  try { res.status(202).json(createImport(req.identity, req.body.playlistUrl)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});
router.get('/spotify/import/:jobId', (req, res) => {
  try { res.set('Cache-Control', 'no-store').json(ownedImport(req.params.jobId, req.identity)); }
  catch (error) { res.status(error.status || 500).json({ error: error.message }); }
});

// GET puzzle from imported Spotify playlist song IDs (excluding previously played song IDs in session)
router.get('/puzzle/spotify', async (req, res) => {
  try {
    const rawIds = (req.query.songIds || '').toString();
    const rawExclude = (req.query.excludeIds || '').toString();

    if (!rawIds) {
      return res.status(400).json({ error: 'songIds parameter is required' });
    }

    const ids = [...new Set(parseSongIds(rawIds))];
    if (!ids.length) return res.status(400).json({ error: 'Invalid songIds' });
    const placeholders = ids.map(() => '?').join(',');
    const songs = db.prepare(`SELECT id, title, artist, preview_url FROM songs WHERE id IN (${placeholders})`).all(...ids);
    const { song, historyReset } = pickSong(songs, parseSongIds(rawExclude));

    if (!song) {
      return res.status(404).json({ error: 'Selected song not found in database' });
    }

    const run = createRun({ owner: req.identity, songId: song.id, mode: 'spotify' });
    res.set('Cache-Control', 'no-store').json({ ...publicPuzzle(run), historyReset });
  } catch (error) {
    console.error('Error fetching Spotify mode puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve Spotify puzzle' });
  }
});

export default router;
