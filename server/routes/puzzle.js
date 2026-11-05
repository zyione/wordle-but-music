import express from 'express';
import { createRun, publicPuzzle } from '../services/gameEngine.js';
import { pickSong, parseSongIds } from '../services/randomSongs.js';
import db from '../db/db.js';
import { scheduleToday } from '../db/scheduleToday.js';

const router = express.Router();



// One shared daily song, with authenticated per-player progress.
router.get('/puzzle/today', (req, res) => {
  try {
    const puzzle = scheduleToday();
    if (!puzzle) return res.status(404).json({ error: 'No playable songs available.' });
    const run = createRun({ owner: req.identity, songId: puzzle.song_id, mode: 'daily', puzzleId: puzzle.id });
    res.set('Cache-Control', 'no-store').json({ ...publicPuzzle(run), puzzleDate: puzzle.puzzle_date });
  } catch (error) { console.error('Daily puzzle failed:', error.message); res.status(500).json({ error: 'Unable to load daily puzzle.' }); }
});

// GET random puzzle for UNLIMITED mode (excluding previously played song IDs in session)
router.get('/puzzle/random', async (req, res) => {
  try {
    const excludeIds = parseSongIds(req.query.excludeIds);
    const { song, historyReset } = pickSong(db.prepare("SELECT id, title, artist, preview_url FROM songs WHERE preview_url <> ''").all(), excludeIds);

    if (!song) {
      return res.status(404).json({ error: 'No songs available in database to play unlimited mode.' });
    }

    const run = createRun({ owner: req.identity, songId: song.id, mode: 'unlimited' });
    res.set('Cache-Control', 'no-store').json({ ...publicPuzzle(run), historyReset });
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve random puzzle' });
  }
});

export default router;
