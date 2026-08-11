import express from 'express';
import {
  createParty,
  joinParty,
  getPartyState,
  startParty,
  getPartyRoundSong,
  submitPartyRoundResult
} from '../services/partyService.js';
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

// POST /api/party/create - Create a new party session
router.post('/party/create', async (req, res) => {
  try {
    const { hostAnonId, displayName, avatarColor, numRounds, maxPlayers, songSource, playlistUrl } = req.body;
    if (!hostAnonId) {
      return res.status(400).json({ error: 'hostAnonId is required' });
    }

    const partyInfo = await createParty({ hostAnonId, displayName, avatarColor, numRounds, maxPlayers, songSource, playlistUrl });
    const fullState = getPartyState(partyInfo.code, hostAnonId);
    res.json(fullState);
  } catch (error) {
    console.error('Error creating party:', error);
    res.status(500).json({ error: error.message || 'Failed to create party' });
  }
});

// POST /api/party/join - Join an existing party session
router.post('/party/join', (req, res) => {
  try {
    const { partyCode, anonId, displayName, avatarColor } = req.body;
    if (!partyCode || !anonId) {
      return res.status(400).json({ error: 'partyCode and anonId are required' });
    }

    const fullState = joinParty({ partyCode, anonId, displayName, avatarColor });
    res.json(fullState);
  } catch (error) {
    console.error('Error joining party:', error);
    res.status(400).json({ error: error.message || 'Failed to join party' });
  }
});

// GET /api/party/:code - Get party state & standings
router.get('/party/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { anonId } = req.query;
    const state = getPartyState(code, anonId);

    if (!state) {
      return res.status(404).json({ error: 'Party not found' });
    }

    res.json(state);
  } catch (error) {
    console.error('Error fetching party state:', error);
    res.status(500).json({ error: 'Failed to fetch party state' });
  }
});

// POST /api/party/:code/start - Host starts the party game
router.post('/party/:code/start', (req, res) => {
  try {
    const { code } = req.params;
    const { hostAnonId } = req.body;
    if (!hostAnonId) {
      return res.status(400).json({ error: 'hostAnonId is required' });
    }

    const updatedState = startParty(code, hostAnonId);
    res.json(updatedState);
  } catch (error) {
    console.error('Error starting party:', error);
    res.status(400).json({ error: error.message || 'Failed to start party' });
  }
});

// GET /api/party/:code/round/:roundNumber - Get specific round details & audio stream
router.get('/party/:code/round/:roundNumber', async (req, res) => {
  try {
    const { code, roundNumber } = req.params;
    const roundData = await getPartyRoundSong(code, roundNumber);
    const config = getSnippetConfig();

    res.json({
      roundNumber: roundData.roundNumber,
      totalRounds: roundData.totalRounds,
      targetSongId: roundData.songId,
      previewUrl: roundData.previewUrl,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs
    });
  } catch (error) {
    console.error('Error fetching party round:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch party round' });
  }
});

// POST /api/party/:code/round/:roundNumber/submit - Submit round score
router.post('/party/:code/round/:roundNumber/submit', (req, res) => {
  try {
    const { code, roundNumber } = req.params;
    const { anonId, isSolved, guessesUsed, timeTakenMs, skipsUsed, wrongGuesses } = req.body;

    if (!anonId) {
      return res.status(400).json({ error: 'anonId is required' });
    }

    const updatedState = submitPartyRoundResult({
      partyCode: code,
      roundNumber,
      anonId,
      isSolved,
      guessesUsed,
      timeTakenMs,
      skipsUsed,
      wrongGuesses
    });

    res.json(updatedState);
  } catch (error) {
    console.error('Error submitting party round result:', error);
    res.status(500).json({ error: error.message || 'Failed to submit party round result' });
  }
});

export default router;
