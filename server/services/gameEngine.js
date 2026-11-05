import { randomUUID } from 'node:crypto';
import db from '../db/db.js';
import config from '../config/snippetDurations.json' with { type: 'json' };
import { calculateScore } from './scoring.js';
export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function getRun(id, owner) {
  const run = db.prepare('SELECT * FROM game_runs WHERE id = ? AND owner_id = ?').get(id, owner);
  if (!run) throw new GameError('Game not found for this session.', 404);
  return run;
}
export function createRun({ owner, songId, mode, puzzleId = null, partyCode = null, roundNumber = null }) {
  if (mode === 'daily') {
    const existing = db.prepare("SELECT * FROM game_runs WHERE mode = 'daily' AND owner_id = ? AND puzzle_id = ?").get(owner, puzzleId);
    if (existing) return existing;
  }
  if (mode === 'party') {
    const existing = db.prepare("SELECT * FROM game_runs WHERE mode = 'party' AND owner_id = ? AND party_code = ? AND round_number = ?").get(owner, partyCode, roundNumber);
    if (existing) return existing;
  }
  const id = randomUUID();
  return db.transaction(() => {
    db.prepare('INSERT INTO game_runs (id, mode, owner_id, song_id, puzzle_id, party_code, round_number, started_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, mode, owner, songId, puzzleId, partyCode, roundNumber, Date.now(), Date.now() + 86400000);
    if (mode === 'daily') {
      const old = db.prepare('SELECT a.* FROM attempts a JOIN sessions s ON s.id = a.session_id WHERE s.anon_id = ? AND a.puzzle_id = ?').get(owner, puzzleId);
      if (old) {
        const guesses = db.prepare('SELECT g.guess_number, g.is_correct, g.guessed_song_id, s.title, s.artist, s.artwork_url FROM guesses g LEFT JOIN songs s ON s.id = g.guessed_song_id WHERE g.attempt_id = ? ORDER BY g.guess_number').all(old.id).map(g => ({ guessNumber: g.guess_number, isCorrect: Boolean(g.is_correct), isSkip: !g.guessed_song_id, guessedSong: g.guessed_song_id ? { id: g.guessed_song_id, title: g.title, artist: g.artist, artwork_url: g.artwork_url } : null }));
        db.prepare('UPDATE game_runs SET guesses_json = ?, guesses_used = ?, is_solved = ?, skips_used = ?, wrong_guesses = ?, score = ?, time_taken_ms = ?, completed_at = ? WHERE id = ?').run(JSON.stringify(guesses), old.guesses_used, old.is_solved, old.skips_used, old.wrong_guesses, old.score, old.time_taken_ms, old.completed_at || (old.is_solved || old.guesses_used >= config.maxGuesses ? new Date().toISOString() : null), id);
      }
    }
    return getRun(id, owner);
  });
}
export function snapshot(run) {
  const isGameOver = Boolean(run.completed_at);
  return { guesses: JSON.parse(run.guesses_json), isGameOver, isSolved: Boolean(run.is_solved), score: run.score, targetSong: isGameOver ? db.prepare('SELECT * FROM songs WHERE id = ?').get(run.song_id) : null };
}
export function publicPuzzle(run) {
  const song = db.prepare('SELECT preview_url FROM songs WHERE id = ?').get(run.song_id);
  return { puzzleId: run.id, targetSongId: run.song_id, previewUrl: song.preview_url, mode: run.mode, ...config, userAttempt: snapshot(run) };
}
function persistDaily(run, guesses) {
  db.prepare('INSERT OR IGNORE INTO sessions (anon_id) VALUES (?)').run(run.owner_id);
  const session = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(run.owner_id);
  db.prepare('INSERT OR IGNORE INTO attempts (puzzle_id, session_id) VALUES (?, ?)').run(run.puzzle_id, session.id);
  const attempt = db.prepare('SELECT id FROM attempts WHERE puzzle_id = ? AND session_id = ?').get(run.puzzle_id, session.id);
  db.prepare('DELETE FROM guesses WHERE attempt_id = ?').run(attempt.id);
  for (const g of guesses) db.prepare('INSERT INTO guesses (attempt_id, guess_number, guessed_song_id, is_correct) VALUES (?, ?, ?, ?)').run(attempt.id, g.guessNumber, g.guessedSong?.id || null, g.isCorrect ? 1 : 0);
  db.prepare('UPDATE attempts SET guesses_used = ?, is_solved = ?, score = ?, time_taken_ms = ?, skips_used = ?, wrong_guesses = ?, completed_at = ? WHERE id = ?').run(run.guesses_used, run.is_solved, run.score, run.time_taken_ms, run.skips_used, run.wrong_guesses, run.completed_at, attempt.id);
}
function persistParty(run) {
  db.prepare('INSERT OR IGNORE INTO party_scores (party_code, round_number, anon_id, song_id, score, guesses_used, time_taken_ms, is_solved) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(run.party_code, run.round_number, run.owner_id, run.song_id, run.score, run.guesses_used, run.time_taken_ms, run.is_solved);
  const party = db.prepare('SELECT * FROM parties WHERE code = ?').get(run.party_code);
  const members = db.prepare('SELECT COUNT(*) AS count FROM party_members WHERE party_code = ?').get(run.party_code);
  const scores = db.prepare('SELECT COUNT(*) AS count FROM party_scores WHERE party_code = ?').get(run.party_code);
  if (scores.count >= members.count * party.num_rounds) db.prepare("UPDATE parties SET status = 'finished' WHERE code = ?").run(run.party_code);
}
export function submitGuess(owner, input) {
  const { puzzleId, requestId, songId, isSkip = false, skipCount = 1, currentGuessesCount } = input;
  if (typeof puzzleId !== 'string' || typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) throw new GameError('A valid game and request ID are required.');
  return db.transaction(() => {
    let run = getRun(puzzleId, owner);
    const previous = db.prepare('SELECT response_json FROM game_requests WHERE game_id = ? AND request_id = ?').get(run.id, requestId);
    if (previous) return JSON.parse(previous.response_json);
    if (run.completed_at) throw new GameError('This game is already complete.', 409);
    if (run.expires_at <= Date.now()) throw new GameError('This game has expired. Start another song.', 410);
    if (!Number.isInteger(currentGuessesCount) || currentGuessesCount !== run.guesses_used) throw new GameError('Game changed. Reload to restore your progress.', 409);
    if (typeof isSkip !== 'boolean') throw new GameError('Invalid guess type.');
    const increment = isSkip ? skipCount : 1;
    if (!Number.isInteger(increment) || increment < 1 || increment > config.maxGuesses - run.guesses_used) throw new GameError('Invalid number of skips.');
    let guessedSong = null;
    if (!isSkip) {
      if (!Number.isSafeInteger(songId) || songId <= 0) throw new GameError('Select a valid song.');
      guessedSong = db.prepare('SELECT id, title, artist, artwork_url FROM songs WHERE id = ?').get(songId);
      if (!guessedSong) throw new GameError('Song not found.');
    }
    if (run.mode === 'party') {
      const party = db.prepare('SELECT status FROM parties WHERE code = ?').get(run.party_code);
      const member = db.prepare('SELECT id FROM party_members WHERE party_code = ? AND anon_id = ?').get(run.party_code, owner);
      if (!member || party?.status !== 'playing') throw new GameError('Party round is not active.', 403);
    }
    const next = run.guesses_used + increment;
    const correct = !isSkip && songId === run.song_id;
    const terminal = correct || next >= config.maxGuesses;
    const guesses = JSON.parse(run.guesses_json);
    for (let step = run.guesses_used + 1; step <= next; step++) guesses.push({ guessNumber: step, isCorrect: step === next && correct, isSkip, guessedSong: step === next ? guessedSong : null });
    const time = Math.max(0, Date.now() - run.started_at);
    const skips = run.skips_used + (isSkip ? increment : 0);
    const wrong = run.wrong_guesses + (!isSkip && !correct ? 1 : 0);
    const score = terminal ? calculateScore({ isSolved: correct, guessNumber: next, maxGuesses: config.maxGuesses, timeTakenMs: time, skipsUsed: skips, wrongGuesses: wrong }) : 0;
    db.prepare('UPDATE game_runs SET guesses_json = ?, guesses_used = ?, is_solved = ?, skips_used = ?, wrong_guesses = ?, score = ?, time_taken_ms = ?, completed_at = ? WHERE id = ?').run(JSON.stringify(guesses), next, correct ? 1 : 0, skips, wrong, score, time, terminal ? new Date().toISOString() : null, run.id);
    run = getRun(run.id, owner);
    if (run.mode === 'daily') persistDaily(run, guesses);
    if (terminal && run.mode === 'party') persistParty(run);
    const response = { ...snapshot(run), guessNumber: next, guessesUsed: next, addedSkips: isSkip ? increment : 0, isCorrect: correct, isSkip, guessedSong };
    db.prepare('INSERT INTO game_requests (game_id, request_id, response_json) VALUES (?, ?, ?)').run(run.id, requestId, JSON.stringify(response));
    return response;
  });
}
