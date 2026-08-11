import express from 'express';
import db from '../db/db.js';
import { scheduleToday } from '../db/scheduleToday.js';
import { ensureFreshPreviewUrl } from '../services/previewRefresher.js';
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
router.get('/puzzle/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const anonId = (req.query.anonId || '').toString();

    let puzzle = db.prepare(`
      SELECT p.id as puzzle_id, p.puzzle_date, s.id as song_id, s.title, s.artist, s.album, s.artwork_url, s.preview_url, s.source_track_id
      FROM puzzles p
      JOIN songs s ON p.song_id = s.id
      WHERE p.puzzle_date = ?
    `).get(today);

    if (!puzzle) {
      const created = scheduleToday();
      if (created) {
        puzzle = db.prepare(`
          SELECT p.id as puzzle_id, p.puzzle_date, s.id as song_id, s.title, s.artist, s.album, s.artwork_url, s.preview_url, s.source_track_id
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
    const freshPreviewUrl = await ensureFreshPreviewUrl(puzzle.song_id, puzzle.title, puzzle.artist, puzzle.preview_url);

    let userAttempt = null;

    if (anonId) {
      let session = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(anonId);
      if (!session) {
        const sRes = db.prepare('INSERT INTO sessions (anon_id) VALUES (?)').run(anonId);
        session = { id: sRes.lastInsertRowid };
      }

      let attempt = db.prepare('SELECT * FROM attempts WHERE puzzle_id = ? AND session_id = ?').get(puzzle.puzzle_id, session.id);

      if (!attempt) {
        // Cross-device sync: check if user completed today's puzzle under their username on another device
        const user = db.prepare('SELECT display_name FROM users WHERE anon_id = ?').get(anonId);
        if (user && user.display_name) {
          const crossDeviceAttempt = db.prepare(`
            SELECT a.*
            FROM attempts a
            JOIN sessions s ON a.session_id = s.id
            JOIN users u ON u.anon_id = s.anon_id
            WHERE a.puzzle_id = ? AND LOWER(u.display_name) = LOWER(?)
            ORDER BY a.id DESC
            LIMIT 1
          `).get(puzzle.puzzle_id, user.display_name);

          if (crossDeviceAttempt) {
            db.prepare('UPDATE attempts SET session_id = ? WHERE id = ?').run(session.id, crossDeviceAttempt.id);
            attempt = crossDeviceAttempt;
          }
        }
      }

      if (attempt) {
          const rawGuesses = db.prepare(`
            SELECT g.guess_number as guessNumber, g.is_correct as isCorrect, g.guessed_song_id as guessedSongId,
                   s.id, s.title, s.artist, s.artwork_url as artworkUrl
            FROM guesses g
            LEFT JOIN songs s ON g.guessed_song_id = s.id
            WHERE g.attempt_id = ?
            ORDER BY g.guess_number ASC
          `).all(attempt.id);

          const formattedGuesses = rawGuesses.map(g => ({
            guessNumber: g.guessNumber,
            isCorrect: Boolean(g.isCorrect),
            isSkip: !g.guessedSongId,
            guessedSong: g.guessedSongId ? {
              id: g.id,
              title: g.title,
              artist: g.artist,
              artwork_url: g.artworkUrl
            } : null
          }));

          const maxGuesses = config.maxGuesses || 6;
          const isGameOver = Boolean(attempt.is_solved || attempt.guesses_used >= maxGuesses);

          userAttempt = {
            guesses: formattedGuesses,
            isGameOver,
            isSolved: Boolean(attempt.is_solved),
            score: attempt.score || 0,
            targetSong: isGameOver ? {
              id: puzzle.song_id,
              title: puzzle.title,
              artist: puzzle.artist,
              album: puzzle.album,
              artwork_url: puzzle.artwork_url,
              preview_url: freshPreviewUrl,
              source_track_id: puzzle.source_track_id
            } : null
          };
        }
      }

    res.json({
      puzzleId: puzzle.puzzle_id,
      puzzleDate: puzzle.puzzle_date,
      targetSongId: puzzle.song_id,
      previewUrl: freshPreviewUrl,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs,
      mode: 'daily',
      userAttempt
    });
  } catch (error) {
    console.error('Error fetching today puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve today puzzle' });
  }
});

// GET random puzzle for UNLIMITED mode (excluding previously played song IDs in session)
router.get('/puzzle/random', async (req, res) => {
  try {
    const rawExclude = (req.query.excludeIds || '').toString();
    const excludeIds = rawExclude.split(',').map(Number).filter(Boolean);

    let song;
    let historyReset = false;

    if (excludeIds.length > 0) {
      const placeholders = excludeIds.map(() => '?').join(',');
      song = db.prepare(`
        SELECT id, title, artist, preview_url FROM songs
        WHERE id NOT IN (${placeholders})
        ORDER BY RANDOM()
        LIMIT 1
      `).get(...excludeIds);
    }

    if (!song) {
      // All songs played in session, reset history and pick random song
      song = db.prepare('SELECT id, title, artist, preview_url FROM songs ORDER BY RANDOM() LIMIT 1').get();
      historyReset = true;
    }

    if (!song) {
      return res.status(404).json({ error: 'No songs available in database to play unlimited mode.' });
    }

    const config = getSnippetConfig();
    const freshPreviewUrl = await ensureFreshPreviewUrl(song.id, song.title, song.artist, song.preview_url);

    res.json({
      puzzleId: `unlimited_${song.id}_${Date.now()}`,
      targetSongId: song.id,
      previewUrl: freshPreviewUrl,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs,
      mode: 'unlimited',
      historyReset
    });
  } catch (error) {
    console.error('Error fetching random puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve random puzzle' });
  }
});

export default router;
