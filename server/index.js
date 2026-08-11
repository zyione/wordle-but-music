import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import configRoutes from './routes/config.js';
import puzzleRoutes from './routes/puzzle.js';
import searchRoutes from './routes/search.js';
import guessRoutes from './routes/guess.js';
import adminRoutes from './routes/admin.js';
import spotifyRoutes from './routes/spotify.js';
import audioProxyRoutes from './routes/audioProxy.js';
import userRoutes from './routes/users.js';
import leaderboardRoutes from './routes/leaderboard.js';
import partyRoutes from './routes/party.js';

import { migrate } from './db/migrate.js';
import { scheduleToday } from './db/scheduleToday.js';
import { seedIfEmpty } from './db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Auto run migration, auto-seed if empty, & today's scheduler on server start
migrate();
seedIfEmpty();

// Normalize and sanitize allowed origins to prevent trailing slash CORS mismatches
const cleanOriginStr = (str) => (str ? str.trim().replace(/\/+$/, '') : '');

const staticAllowed = [
  cleanOriginStr(CLIENT_ORIGIN),
  'https://wordle-but-music.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);

    const cleanReqOrigin = cleanOriginStr(origin);
    const isAllowed = staticAllowed.some((allowed) => allowed === cleanReqOrigin) ||
      cleanReqOrigin.endsWith('.vercel.app'); // Allow any Vercel preview domain

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from origin: "${origin}"`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  maxAge: 86400
}));

app.use(express.json());

// API Routes
app.use('/api', configRoutes);
app.use('/api', puzzleRoutes);
app.use('/api', searchRoutes);
app.use('/api', guessRoutes);
app.use('/api', spotifyRoutes);
app.use('/api', audioProxyRoutes);
app.use('/api', userRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', partyRoutes);
app.use('/api', adminRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎵 Song Guesser server listening on port ${PORT}`);
  console.log(`   Configured CORS origin: ${CLIENT_ORIGIN}`);
});
