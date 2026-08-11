import db from '../db/db.js';
import { fetchTrackMetadata } from './deezerClient.js';

/**
 * Validates and auto-refreshes Deezer preview URLs if expired or returning HTTP errors.
 * Updates the SQLite database if a new preview URL is fetched.
 *
 * @param {number|string} [songId] - Song ID in database
 * @param {string} [title] - Song title
 * @param {string} [artist] - Song artist
 * @param {string} [currentUrl] - Current preview URL
 * @returns {Promise<string>} Valid unexpired preview URL or original fallback
 */
export async function ensureFreshPreviewUrl(songId, title, artist, currentUrl) {
  try {
    if (currentUrl) {
      // Test URL with a lightweight GET request with Range header to verify token validity
      const testRes = await fetch(currentUrl, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' }
      }).catch(() => null);

      if (testRes && (testRes.ok || testRes.status === 206)) {
        return currentUrl;
      }
    }

    if (title && artist) {
      console.log(`Refreshing expired preview URL for "${title}" by ${artist}...`);
      const fresh = await fetchTrackMetadata(title, artist);
      if (fresh && fresh.preview_url) {
        if (songId) {
          db.prepare('UPDATE songs SET preview_url = ? WHERE id = ?').run(fresh.preview_url, songId);
        }
        return fresh.preview_url;
      }
    }
  } catch (err) {
    console.warn('Error refreshing preview URL:', err.message);
  }
  return currentUrl || '';
}
