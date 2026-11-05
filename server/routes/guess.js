import express from 'express';
import { submitGuess } from '../services/gameEngine.js';
const router = express.Router();
router.post('/guess', (req, res) => {
  try { res.json(submitGuess(req.identity, req.body)); }
  catch (error) { if (!error.status) console.error('Guess failed:', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'Unable to save guess. Please retry.' }); }
});
export default router;
