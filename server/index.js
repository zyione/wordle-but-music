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
import { migrate } from './db/migrate.js';
import { scheduleToday } from './db/scheduleToday.js';
import { seedIfEmpty } from './db/seed.js';

import spotifyRoutes from './routes/spotify.js';
import audioProxyRoutes from './routes/audioProxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Auto run migration, auto-seed if empty, & today's scheduler on server start
migrate();
seedIfEmpty();

app.use(cors({
  origin: [
    CLIENT_ORIGIN,
    'https://wordle-but-music.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));

app.use(express.json());

// API Routes
app.use('/api', configRoutes);
app.use('/api', puzzleRoutes);
app.use('/api', searchRoutes);
app.use('/api', guessRoutes);
app.use('/api', spotifyRoutes);
app.use('/api', audioProxyRoutes);
app.use('/', adminRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎵 Song Guesser server listening on port ${PORT}`);
  console.log(`   Configured CORS origin: ${CLIENT_ORIGIN}`);
});
