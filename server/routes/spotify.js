import express from 'express';
import db from '../db/db.js';
import { parseSpotifyPlaylist } from '../services/spotifyClient.js';
import { fetchTrackMetadata } from '../services/deezerClient.js';
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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Import tracks from a Spotify playlist URL with streaming NDJSON progress
router.post('/spotify/import', async (req, res) => {
  try {
    const { playlistUrl } = req.body;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'playlistUrl is required' });
    }

    // Set headers for streaming chunked response
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');

    console.log(`Importing Spotify Playlist: ${playlistUrl}`);
    const parsed = await parseSpotifyPlaylist(playlistUrl);

    const tracksToProcess = parsed.songs.slice(0, 50);
    const total = tracksToProcess.length;

    // Send initial status event
    res.write(JSON.stringify({ type: 'init', playlistName: parsed.playlistName, total }) + '\n');

    const insertStmt = db.prepare(`
      INSERT INTO songs (title, artist, album, artwork_url, preview_url, source, source_track_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_track_id) DO UPDATE SET
        title = excluded.title,
        artist = excluded.artist,
        album = excluded.album,
        artwork_url = excluded.artwork_url,
        preview_url = excluded.preview_url
    `);

    const validSongIds = [];

    for (let i = 0; i < total; i++) {
      const track = tracksToProcess[i];

      // Stream progress update chunk
      res.write(JSON.stringify({
        type: 'progress',
        current: i + 1,
        total,
        title: track.title,
        artist: track.artist
      }) + '\n');

      // Check if song is already in DB by title/artist
      const existing = db.prepare('SELECT id FROM songs WHERE title = ? AND artist = ?').get(track.title, track.artist);
      if (existing) {
        validSongIds.push(existing.id);
        continue;
      }

      // Look up Deezer audio preview
      const meta = await fetchTrackMetadata(track.title, track.artist);
      if (meta && meta.preview_url) {
        insertStmt.run(
          meta.title,
          meta.artist,
          meta.album,
          meta.artwork_url,
          meta.preview_url,
          meta.source,
          meta.source_track_id
        );
        const saved = db.prepare('SELECT id FROM songs WHERE source_track_id = ?').get(meta.source_track_id);
        if (saved) {
          validSongIds.push(saved.id);
        }
      }
      await delay(100); // Small rate limit pacing for Deezer API
    }

    if (!validSongIds.length) {
      res.write(JSON.stringify({ type: 'error', error: 'Could not find playable preview streams for songs in this playlist.' }) + '\n');
      return res.end();
    }

    const finalResult = {
      type: 'complete',
      playlistId: parsed.playlistId,
      playlistName: parsed.playlistName,
      totalPlaylistTracks: parsed.songsCount,
      importedTracksCount: validSongIds.length,
      songIds: validSongIds
    };

    res.write(JSON.stringify(finalResult) + '\n');
    res.end();
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Failed to import Spotify playlist' });
    }
    res.write(JSON.stringify({ type: 'error', error: error.message || 'Failed to import Spotify playlist' }) + '\n');
    res.end();
  }
});

// GET puzzle from imported Spotify playlist song IDs (excluding previously played song IDs in session)
router.get('/puzzle/spotify', (req, res) => {
  try {
    const rawIds = (req.query.songIds || '').toString();
    const rawExclude = (req.query.excludeIds || '').toString();

    if (!rawIds) {
      return res.status(400).json({ error: 'songIds parameter is required' });
    }

    const ids = rawIds.split(',').map(Number).filter(Boolean);
    const excludeIds = new Set(rawExclude.split(',').map(Number).filter(Boolean));

    if (!ids.length) {
      return res.status(400).json({ error: 'Invalid songIds' });
    }

    // Filter available candidate IDs by excluding previously played IDs
    let candidateIds = ids.filter(id => !excludeIds.has(id));
    let historyReset = false;

    if (!candidateIds.length) {
      // All songs in playlist played, auto-reset session candidates
      candidateIds = ids;
      historyReset = true;
    }

    const randomId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
    const song = db.prepare('SELECT id, preview_url FROM songs WHERE id = ?').get(randomId);

    if (!song) {
      return res.status(404).json({ error: 'Selected song not found in database' });
    }

    const config = getSnippetConfig();

    res.json({
      puzzleId: `spotify_${song.id}_${Date.now()}`,
      targetSongId: song.id,
      previewUrl: song.preview_url,
      maxGuesses: config.maxGuesses,
      guessDurationsMs: config.guessDurationsMs,
      mode: 'spotify',
      historyReset
    });
  } catch (error) {
    console.error('Error fetching Spotify mode puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve Spotify puzzle' });
  }
});

export default router;
