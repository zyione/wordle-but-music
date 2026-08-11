import express from 'express';
import db from '../db/db.js';
import { fetchTrackMetadata } from '../services/deezerClient.js';

const router = express.Router();

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Referer': 'https://www.deezer.com/',
  'Origin': 'https://www.deezer.com',
  'Accept': '*/*'
};

// Proxy endpoint to bypass CORS & browser media streaming blocks in Firefox/Zen/Chrome
router.get('/audio/proxy', async (req, res) => {
  try {
    let audioUrl = req.query.url;
    const songId = req.query.songId;

    if (!audioUrl && !songId) {
      return res.status(400).send('Missing url or songId query parameter');
    }

    // If songId provided but no audioUrl, get preview_url from DB
    if (!audioUrl && songId) {
      const song = db.prepare('SELECT preview_url FROM songs WHERE id = ?').get(songId);
      audioUrl = song?.preview_url;
    }

    if (!audioUrl) {
      return res.status(404).send('Audio preview URL not found');
    }

    let response = await fetch(audioUrl, { headers: FETCH_HEADERS }).catch(() => null);

    // Auto-healing fallback if upstream URL returns HTTP error (e.g. 403 Forbidden on expired Deezer token)
    if (!response || !response.ok) {
      console.warn(`Upstream audio return ${response ? response.status : 'ERR'} for audio proxy, attempting auto-refresh...`);

      let song;
      if (songId) {
        song = db.prepare('SELECT id, title, artist FROM songs WHERE id = ?').get(songId);
      }
      if (!song) {
        song = db.prepare('SELECT id, title, artist FROM songs WHERE preview_url = ?').get(audioUrl);
      }

      if (song) {
        const fresh = await fetchTrackMetadata(song.title, song.artist);
        if (fresh && fresh.preview_url) {
          console.log(`Auto-refreshed preview URL for "${song.title}" (ID: ${song.id})`);
          db.prepare('UPDATE songs SET preview_url = ? WHERE id = ?').run(fresh.preview_url, song.id);
          audioUrl = fresh.preview_url;
          response = await fetch(audioUrl, { headers: FETCH_HEADERS }).catch(() => null);
        }
      }
    }

    if (!response || !response.ok) {
      console.error(`Failed audio proxy stream for ${audioUrl}: status ${response ? response.status : 'ERR'}`);
      return res.status(response ? response.status : 500).send('Failed to fetch audio stream from upstream');
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Audio proxy error:', error.message);
    res.status(500).send('Audio proxy error');
  }
});

export default router;
