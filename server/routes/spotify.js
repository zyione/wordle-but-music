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

// Import tracks from a Spotify playlist URL
router.post('/spotify/import', async (req, res) => {
  try {
    const { playlistUrl } = req.body;
    if (!playlistUrl) {
      return res.status(400).json({ error: 'playlistUrl is required' });
    }

    console.log(`Importing Spotify Playlist: ${playlistUrl}`);
    const parsed = await parseSpotifyPlaylist(playlistUrl);

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

    // Process top 50 tracks from playlist
    const tracksToProcess = parsed.songs.slice(0, 50);

    for (const track of tracksToProcess) {
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
      await delay(120); // Small rate limit pacing for Deezer API
    }

    if (!validSongIds.length) {
      return res.status(400).json({ error: 'Could not find playable preview streams for songs in this playlist.' });
    }

    res.json({
      playlistId: parsed.playlistId,
      playlistName: parsed.playlistName,
      totalPlaylistTracks: parsed.songsCount,
      importedTracksCount: validSongIds.length,
      songIds: validSongIds
    });
  } catch (error) {
    console.error('Error importing Spotify playlist:', error);
    res.status(500).json({ error: error.message || 'Failed to import Spotify playlist' });
  }
});

// GET puzzle from imported Spotify playlist song IDs
router.get('/puzzle/spotify', (req, res) => {
  try {
    const rawIds = (req.query.songIds || '').toString();
    if (!rawIds) {
      return res.status(400).json({ error: 'songIds parameter is required' });
    }

    const ids = rawIds.split(',').map(Number).filter(Boolean);
    if (!ids.length) {
      return res.status(400).json({ error: 'Invalid songIds' });
    }

    // Pick random song from the playlist's song IDs
    const randomId = ids[Math.floor(Math.random() * ids.length)];
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
      mode: 'spotify'
    });
  } catch (error) {
    console.error('Error fetching Spotify mode puzzle:', error);
    res.status(500).json({ error: 'Failed to retrieve Spotify puzzle' });
  }
});

export default router;
