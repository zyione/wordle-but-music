import express from 'express';
import db from '../db/db.js';
import { calculateScore } from '../services/scoring.js';

const router = express.Router();

// GET /api/leaderboard/daily?date=YYYY-MM-DD - Get top daily puzzle scores
router.get('/leaderboard/daily', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const date = (req.query.date || today).toString();

    const rows = db.prepare(`
      SELECT 
        a.score,
        a.guesses_used as guessesUsed,
        a.time_taken_ms as timeTakenMs,
        a.is_solved as isSolved,
        a.completed_at as completedAt,
        u.display_name as displayName,
        u.avatar_color as avatarColor,
        s.anon_id as anonId
      FROM attempts a
      JOIN puzzles p ON a.puzzle_id = p.id
      JOIN sessions s ON a.session_id = s.id
      LEFT JOIN users u ON s.anon_id = u.anon_id
      WHERE p.puzzle_date = ? AND (a.score > 0 OR a.is_solved = 1)
      ORDER BY a.score DESC, a.guesses_used ASC, a.time_taken_ms ASC
      LIMIT 50
    `).all(date);

    const leaderboard = rows.map((r, idx) => {
      const computedScore = r.score > 0 ? r.score : calculateScore({
        isSolved: Boolean(r.isSolved),
        guessNumber: r.guessesUsed || 1,
        maxGuesses: 6,
        timeTakenMs: r.timeTakenMs || 10000
      });

      return {
        rank: idx + 1,
        displayName: r.displayName || 'Anonymous Guesser',
        avatarColor: r.avatarColor || '#3b82f6',
        anonId: r.anonId,
        score: computedScore,
        guessesUsed: r.guessesUsed,
        timeTakenMs: r.timeTakenMs,
        isSolved: Boolean(r.isSolved),
        completedAt: r.completedAt
      };
    }).sort((a, b) => b.score - a.score);

    leaderboard.forEach((item, index) => { item.rank = index + 1; });

    res.json({ date, leaderboard });
  } catch (error) {
    console.error('Error fetching daily leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch daily leaderboard' });
  }
});

// GET /api/leaderboard/alltime - Get top all-time scores
router.get('/leaderboard/alltime', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        a.score,
        a.guesses_used as guessesUsed,
        a.time_taken_ms as timeTakenMs,
        a.is_solved as isSolved,
        a.completed_at as completedAt,
        p.puzzle_date as puzzleDate,
        u.display_name as displayName,
        u.avatar_color as avatarColor,
        s.anon_id as anonId
      FROM attempts a
      JOIN puzzles p ON a.puzzle_id = p.id
      JOIN sessions s ON a.session_id = s.id
      LEFT JOIN users u ON s.anon_id = u.anon_id
      WHERE (a.score > 0 OR a.is_solved = 1)
      ORDER BY a.score DESC, a.guesses_used ASC, a.time_taken_ms ASC
      LIMIT 50
    `).all();

    const leaderboard = rows.map((r, idx) => {
      const computedScore = r.score > 0 ? r.score : calculateScore({
        isSolved: Boolean(r.isSolved),
        guessNumber: r.guessesUsed || 1,
        maxGuesses: 6,
        timeTakenMs: r.timeTakenMs || 10000
      });

      return {
        rank: idx + 1,
        displayName: r.displayName || 'Anonymous Guesser',
        avatarColor: r.avatarColor || '#3b82f6',
        anonId: r.anonId,
        score: computedScore,
        guessesUsed: r.guessesUsed,
        timeTakenMs: r.timeTakenMs,
        puzzleDate: r.puzzleDate,
        isSolved: Boolean(r.isSolved)
      };
    }).sort((a, b) => b.score - a.score);

    leaderboard.forEach((item, index) => { item.rank = index + 1; });

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching alltime leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch alltime leaderboard' });
  }
});

export default router;
