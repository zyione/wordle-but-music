import express from 'express';
import db from '../db/db.js';

const router = express.Router();

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

// POST /api/users/profile - Register or update profile
router.post('/users/profile', (req, res) => {
  try {
    const { anonId, displayName, avatarColor } = req.body;

    if (!anonId || !displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'anonId and non-empty displayName are required' });
    }

    const cleanName = displayName.trim().substring(0, 25);
    const color = PRESET_COLORS.includes(avatarColor) ? avatarColor : PRESET_COLORS[0];

    const existing = db.prepare('SELECT * FROM users WHERE anon_id = ?').get(anonId);

    if (existing) {
      db.prepare(`
        UPDATE users
        SET display_name = ?, avatar_color = ?
        WHERE anon_id = ?
      `).run(cleanName, color, anonId);
    } else {
      db.prepare(`
        INSERT INTO users (anon_id, display_name, avatar_color)
        VALUES (?, ?, ?)
      `).run(anonId, cleanName, color);
    }

    const updated = db.prepare('SELECT id, anon_id, display_name, avatar_color FROM users WHERE anon_id = ?').get(anonId);

    res.json({
      id: updated.id,
      anonId: updated.anon_id,
      displayName: updated.display_name,
      avatarColor: updated.avatar_color
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

    const user = db.prepare('SELECT id, anon_id, display_name, avatar_color FROM users WHERE anon_id = ?').get(anonId);

    if (!user) {
      return res.json({ profile: null });
    }

    res.json({
      profile: {
        id: user.id,
        anonId: user.anon_id,
        displayName: user.display_name,
        avatarColor: user.avatar_color
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
