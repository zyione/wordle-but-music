import express from 'express';
import db from '../db/db.js';
import { scheduleToday } from '../db/scheduleToday.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

function getSnippetConfig() {
  const configPath = path.resolve(__dirname, '../config/snippetDurations.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// GET today's puzzle
router.get('/puzzle/today', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let puzzle = db.prepare(`
      SELECT p.id as puzzle_id, p.puzzle_date, s.preview_url
      FROM puzzles p
      JOIN songs s ON p.song_id = s.id
      WHERE p.puzzle_date = ?
    `).get(today);

    if (!puzzle) {
      const created = scheduleToday();
      if (created) {
        puzzle = db.prepare(`
          SELECT p.id as puzzle_id, p.puzzle_date, s.preview_url
          FROM puzzles p
          JOIN songs s ON p.song_id = s.id
          WHERE p.id = ?
        `).get(created.id);
      }
    }

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzle found for today. Please seed the database.' });
    }

    const config = getSnippetConfig();

    res.json({
      puzzleId: puzzle.puzzle_id,
      puzzleDate: puzzle.puzzle_date,
      previewUrl: puzzle.preview_url,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs,
      mode: 'daily'
    });
  } catch (error) {
    console.error('Error fetching today puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve today puzzle' });
  }
});

// GET random puzzle for UNLIMITED mode
router.get('/puzzle/random', (req, res) => {
  try {
    const song = db.prepare('SELECT id, preview_url FROM songs ORDER BY RANDOM() LIMIT 1').get();
    if (!song) {
      return res.status(404).json({ error: 'No songs available in database to play unlimited mode.' });
    }

    const config = getSnippetConfig();

    res.json({
      puzzleId: `unlimited_${song.id}_${Date.now()}`,
      targetSongId: song.id,
      previewUrl: song.preview_url,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs,
      mode: 'unlimited'
    });
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve random puzzle' });
  }
});

export default router;
