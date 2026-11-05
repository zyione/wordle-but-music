import express from 'express';
import db from '../db/db.js';
import { hashPin, verifyPin } from '../services/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
const router = express.Router();
const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
const format = user => ({ id: user.id, anonId: user.anon_id, displayName: user.display_name, avatarColor: user.avatar_color, hasPin: Boolean(user.pin) });
router.get('/users/check-name', (req, res) => {
  const name = String(req.query.displayName || '').trim().slice(0, 25);
  if (!name) return res.status(400).json({ error: 'Display name is required' });
  const user = db.prepare('SELECT * FROM users WHERE LOWER(display_name) = LOWER(?)').get(name);
  res.json({ taken: Boolean(user && user.anon_id !== req.identity), isSelf: user?.anon_id === req.identity, displayName: name });
});

function mergeGuestAttempts(guest, account) {
  if (guest === account) return;
  const from = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(guest);
  if (!from) return;
  db.prepare('INSERT OR IGNORE INTO sessions (anon_id) VALUES (?)').run(account);
  const to = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(account);
  for (const attempt of db.prepare('SELECT * FROM attempts WHERE session_id = ?').all(from.id)) {
    const existing = db.prepare('SELECT * FROM attempts WHERE session_id = ? AND puzzle_id = ?').get(to.id, attempt.puzzle_id);
    // Keep the established account attempt; never replace completed daily results.
    if (existing) {
      db.prepare('DELETE FROM guesses WHERE attempt_id = ?').run(attempt.id);
      db.prepare('DELETE FROM attempts WHERE id = ?').run(attempt.id);
    } else db.prepare('UPDATE attempts SET session_id = ? WHERE id = ?').run(to.id, attempt.id);
  }
}
router.post('/users/profile', rateLimit({ limit: 30 }), rateLimit({ limit: 5, key: req => String(req.body.displayName || '').trim().toLowerCase() }), (req, res) => {
  try {
    const displayName = typeof req.body.displayName === 'string' ? req.body.displayName.trim().slice(0, 25) : '';
    const pin = String(req.body.pin || '');
    if (!displayName || !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'Enter a display name and a 4-digit PIN.' });
    const existing = db.prepare('SELECT * FROM users WHERE LOWER(display_name) = LOWER(?)').get(displayName);
    const owned = db.prepare('SELECT * FROM users WHERE anon_id = ?').get(req.identity);
    if (existing && existing.anon_id !== req.identity) {
      if (!verifyPin(pin, existing.pin)) return res.status(401).json({ error: 'Incorrect name or PIN.' });
      db.transaction(() => {
        // Authenticated accounts retain their own attempts when switching accounts.
        if (!owned) mergeGuestAttempts(req.identity, existing.anon_id);
        db.prepare('UPDATE auth_sessions SET anon_id = ? WHERE token_hash = ?').run(existing.anon_id, req.auth.token_hash);
      });
      return res.json({ ...format(existing), isLogin: true });
    }
    const avatarColor = colors.includes(req.body.avatarColor) ? req.body.avatarColor : owned?.avatar_color || colors[0];
    db.transaction(() => {
      if (owned) db.prepare('UPDATE users SET display_name = ?, pin = ?, avatar_color = ? WHERE id = ?').run(displayName, hashPin(pin), avatarColor, owned.id);
      else db.prepare('INSERT INTO users (anon_id, display_name, pin, avatar_color) VALUES (?, ?, ?, ?)').run(req.identity, displayName, hashPin(pin), avatarColor);
    });
    res.json(format(db.prepare('SELECT * FROM users WHERE anon_id = ?').get(req.identity)));
  } catch (error) { console.error('Profile update failed:', error.message); res.status(500).json({ error: 'Unable to save profile. Please retry.' }); }
});
router.get('/users/profile', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE anon_id = ?').get(req.identity);
  res.set('Cache-Control', 'no-store').json({ profile: user ? format(user) : null });
});
export default router;
