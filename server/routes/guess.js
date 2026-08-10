import express from 'express';
import db from '../db/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

function getMaxGuesses() {
  const configPath = path.resolve(__dirname, '../config/snippetDurations.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.maxGuesses || 6;
}

router.post('/guess', (req, res) => {
  try {
    const { puzzleId, anonId, songId, isSkip, mode, targetSongId, currentGuessesCount = 0 } = req.body;

    if (!puzzleId || !anonId) {
      return res.status(400).json({ error: 'puzzleId and anonId are required' });
    }

    const maxGuesses = getMaxGuesses();

    // UNLIMITED & SPOTIFY PLAYLIST MODE HANDLING
    if (mode === 'unlimited' || mode === 'spotify' || String(puzzleId).startsWith('unlimited_') || String(puzzleId).startsWith('spotify_')) {
      const targetSong = db.prepare(`
        SELECT id, title, artist, album, artwork_url, preview_url, source_track_id
        FROM songs
        WHERE id = ?
      `).get(targetSongId);

      if (!targetSong) {
        return res.status(404).json({ error: 'Target song not found for unlimited mode' });
      }

      const nextGuessNumber = currentGuessesCount + 1;
      const isCorrect = !isSkip && songId && Number(songId) === Number(targetSong.id);
      const isGameOver = isCorrect || nextGuessNumber >= maxGuesses;

      let guessedSongInfo = null;
      if (songId) {
        guessedSongInfo = db.prepare('SELECT id, title, artist, artwork_url FROM songs WHERE id = ?').get(songId);
      }

      return res.json({
        guessNumber: nextGuessNumber,
        isCorrect,
        isGameOver,
        isSkip: Boolean(isSkip),
        guessedSong: guessedSongInfo,
        guessesUsed: nextGuessNumber,
        targetSong: isGameOver ? targetSong : null
      });
    }

    // DAILY MODE HANDLING
    const puzzle = db.prepare(`
      SELECT p.id, p.song_id, s.title, s.artist, s.album, s.artwork_url, s.preview_url, s.source_track_id
      FROM puzzles p
      JOIN songs s ON p.song_id = s.id
      WHERE p.id = ?
    `).get(puzzleId);

    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    // Get or create session
    let session = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(anonId);
    if (!session) {
      db.prepare('INSERT INTO sessions (anon_id) VALUES (?)').run(anonId);
      session = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(anonId);
    }

    // Get or create attempt
    let attempt = db.prepare('SELECT * FROM attempts WHERE puzzle_id = ? AND session_id = ?').get(puzzleId, session.id);
    if (!attempt) {
      db.prepare(`
        INSERT INTO attempts (puzzle_id, session_id, guesses_used, is_solved)
        VALUES (?, ?, 0, 0)
      `).run(puzzleId, session.id);
      attempt = db.prepare('SELECT * FROM attempts WHERE puzzle_id = ? AND session_id = ?').get(puzzleId, session.id);
    }

    // If attempt is already solved or completed
    if (attempt.is_solved || attempt.guesses_used >= maxGuesses) {
      return res.json({
        isCorrect: Boolean(attempt.is_solved),
        isGameOver: true,
        guessesUsed: attempt.guesses_used,
        targetSong: {
          id: puzzle.song_id,
          title: puzzle.title,
          artist: puzzle.artist,
          album: puzzle.album,
          artwork_url: puzzle.artwork_url,
          preview_url: puzzle.preview_url,
          source_track_id: puzzle.source_track_id
        }
      });
    }

    const nextGuessNumber = attempt.guesses_used + 1;
    const isCorrect = !isSkip && songId && Number(songId) === Number(puzzle.song_id);

    // Insert guess record
    db.prepare(`
      INSERT INTO guesses (attempt_id, guess_number, guessed_song_id, is_correct)
      VALUES (?, ?, ?, ?)
    `).run(attempt.id, nextGuessNumber, isSkip ? null : songId, isCorrect ? 1 : 0);

    const newGuessesUsed = nextGuessNumber;
    const isSolved = isCorrect ? 1 : 0;
    const isGameOver = isSolved === 1 || newGuessesUsed >= maxGuesses;
    const completedAt = isGameOver ? new Date().toISOString() : null;

    // Update attempt
    db.prepare(`
      UPDATE attempts
      SET guesses_used = ?, is_solved = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(newGuessesUsed, isSolved, completedAt, attempt.id);

    // Get guessed song details if provided
    let guessedSongInfo = null;
    if (songId) {
      guessedSongInfo = db.prepare('SELECT id, title, artist, artwork_url FROM songs WHERE id = ?').get(songId);
    }

    res.json({
      guessNumber: nextGuessNumber,
      isCorrect,
      isGameOver,
      isSkip: Boolean(isSkip),
      guessedSong: guessedSongInfo,
      guessesUsed: newGuessesUsed,
      targetSong: isGameOver ? {
        id: puzzle.song_id,
        title: puzzle.title,
        artist: puzzle.artist,
        album: puzzle.album,
        artwork_url: puzzle.artwork_url,
        preview_url: puzzle.preview_url,
        source_track_id: puzzle.source_track_id
      } : null
    });
  } catch (error) {
    console.error('Error processing guess:', error);
    res.status(500).json({ error: 'Failed to process guess' });
  }
});

export default router;
