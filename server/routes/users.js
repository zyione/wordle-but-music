import express from 'express';
import db from '../db/db.js';

const router = express.Router();

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

// GET /api/users/check-name?displayName=... - Check if a username is registered
router.get('/users/check-name', (req, res) => {
  try {
    const { displayName, anonId } = req.query;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'displayName parameter is required' });
    }

    const cleanName = displayName.trim();
    const existing = db.prepare('SELECT id, anon_id, display_name FROM users WHERE LOWER(display_name) = LOWER(?)').get(cleanName);

    if (!existing) {
      return res.json({ taken: false, isSelf: false, displayName: cleanName });
    }

    const isSelf = existing.anon_id === anonId;
    return res.json({
      taken: !isSelf,
      isSelf,
      displayName: existing.display_name
    });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// POST /api/users/profile - Register, update, or log in to a profile using 4-digit PIN
router.post('/users/profile', (req, res) => {
  try {
    const { anonId, displayName, pin, avatarColor } = req.body;

    if (!anonId || !displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'anonId and non-empty displayName are required' });
    }

    const cleanName = displayName.trim().substring(0, 25);
    const cleanPin = String(pin || '').trim();
    const color = PRESET_COLORS.includes(avatarColor) ? avatarColor : PRESET_COLORS[0];

    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      return res.status(400).json({ error: 'A 4-digit numeric PIN is required (e.g. 1234)' });
    }

    // Check if user profile already exists for this anon_id
    const userByAnon = db.prepare('SELECT * FROM users WHERE anon_id = ?').get(anonId);

    // Check if user profile exists with this display_name (case-insensitive)
    const userByName = db.prepare('SELECT * FROM users WHERE LOWER(display_name) = LOWER(?)').get(cleanName);

    if (userByName && userByName.anon_id !== anonId) {
      // Username is already claimed by another session!
      // Check 4-digit PIN to authorize login/claim
      if (userByName.pin && userByName.pin !== cleanPin) {
        return res.status(401).json({
          error: `Incorrect 4-digit PIN for "${cleanName}". Enter the correct PIN or pick another name.`
        });
      }

      // Re-assign previous sessions in database to current anonId so daily attempts follow user cross-device
      try {
        const oldSession = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(userByName.anon_id);
        let newSession = db.prepare('SELECT id FROM sessions WHERE anon_id = ?').get(anonId);
        if (!newSession) {
          const sRes = db.prepare('INSERT INTO sessions (anon_id) VALUES (?)').run(anonId);
          newSession = { id: sRes.lastInsertRowid };
        }
        if (oldSession && newSession) {
          db.prepare('UPDATE attempts SET session_id = ? WHERE session_id = ?').run(newSession.id, oldSession.id);
        }
      } catch (err) {
        console.warn('Session attempt transfer warning:', err);
      }

      // PIN matches or profile has no PIN set yet -> Log in / Claim profile!
      db.prepare(`
        UPDATE users
        SET anon_id = ?, avatar_color = ?, pin = ?
        WHERE id = ?
      `).run(anonId, color, cleanPin, userByName.id);

      // Clean up orphaned session record if anon_id had a temporary profile
      if (userByAnon && userByAnon.id !== userByName.id) {
        try {
          db.prepare('DELETE FROM users WHERE id = ?').run(userByAnon.id);
        } catch {}
      }

      const claimedUser = db.prepare('SELECT id, anon_id, display_name, avatar_color, pin FROM users WHERE anon_id = ?').get(anonId);
      return res.json({
        id: claimedUser.id,
        anonId: claimedUser.anon_id,
        displayName: claimedUser.display_name,
        avatarColor: claimedUser.avatar_color,
        hasPin: Boolean(claimedUser.pin),
        isLogin: true
      });
    }

    // New profile or updating existing owned profile
    if (userByAnon) {
      db.prepare(`
        UPDATE users
        SET display_name = ?, avatar_color = ?, pin = ?
        WHERE anon_id = ?
      `).run(cleanName, color, cleanPin, anonId);
    } else {
      db.prepare(`
        INSERT INTO users (anon_id, display_name, avatar_color, pin)
        VALUES (?, ?, ?, ?)
      `).run(anonId, cleanName, color, cleanPin);
    }

    const updated = db.prepare('SELECT id, anon_id, display_name, avatar_color, pin FROM users WHERE anon_id = ?').get(anonId);

    res.json({
      id: updated.id,
      anonId: updated.anon_id,
      displayName: updated.display_name,
      avatarColor: updated.avatar_color,
      hasPin: Boolean(updated.pin),
      isLogin: false
    });
  } catch (error) {
    console.error('Error saving user profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// GET /api/users/profile?anonId=... - Get user profile
router.get('/users/profile', (req, res) => {
  try {
    const { anonId } = req.query;
    if (!anonId) {
      return res.status(400).json({ error: 'anonId parameter is required' });
    }

    const user = db.prepare('SELECT id, anon_id, display_name, avatar_color, pin FROM users WHERE anon_id = ?').get(anonId);

    if (!user) {
      return res.json({ profile: null });
    }

    res.json({
      profile: {
        id: user.id,
        anonId: user.anon_id,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        hasPin: Boolean(user.pin)
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
