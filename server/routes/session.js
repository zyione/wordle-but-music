import express from 'express';
import { createSession, readSession } from '../services/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
const router = express.Router();
router.post('/session', rateLimit({ limit: 120 }), (req, res) => {
  const existing = readSession(req);
  res.set('Cache-Control', 'no-store').json(existing ? { token: existing.token, anonId: existing.anon_id } : createSession());
});
export default router;
