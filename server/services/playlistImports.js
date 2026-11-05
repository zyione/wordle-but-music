import { randomUUID } from 'node:crypto';
import db from '../db/db.js';
import { parseSpotifyPlaylist } from './spotifyClient.js';
import { fetchTrackMetadata } from './deezerClient.js';
let running = 0;
const active = new Set();
export function importStatus(job) {
  const ids = JSON.parse(job.song_ids_json);
  const tracks = JSON.parse(job.tracks_json);
  const processed = JSON.parse(job.processed_json);
  return { jobId: job.id, status: job.status, playlistId: job.playlist_id, playlistName: job.playlist_name || 'Spotify playlist', current: processed.length, total: tracks.length, readyCount: ids.length, importedTracksCount: ids.length, songIds: ids, skippedCount: processed.length - ids.length, isImporting: ['queued','processing'].includes(job.status), isComplete: job.status === 'complete', error: job.error };
}
export function ownedImport(id, owner) {
  const job = db.prepare('SELECT * FROM playlist_imports WHERE id = ? AND owner_id = ?').get(id, owner);
  if (!job) throw Object.assign(new Error('Import not found.'), { status: 404 });
  return importStatus(job);
}
export function createImport(owner, input) {
  const url = String(input || '').trim();
  if (!/^(?:https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/[A-Za-z0-9]+(?:[?#].*)?|[A-Za-z0-9]{22})$/.test(url)) throw Object.assign(new Error('Enter a public Spotify playlist link.'), { status: 400 });
  const existing = db.prepare("SELECT * FROM playlist_imports WHERE owner_id = ? AND input_url = ? AND status IN ('queued','processing')").get(owner, url);
  if (existing) return importStatus(existing);
  const id = randomUUID();
  db.transaction(() => {
    db.prepare("UPDATE playlist_imports SET status = 'cancelled' WHERE owner_id = ? AND status IN ('queued','processing')").run(owner);
    db.prepare('INSERT INTO playlist_imports (id, owner_id, input_url, created_at) VALUES (?, ?, ?, ?)').run(id, owner, url, Date.now());
  });
  setImmediate(resumeImports);
  return ownedImport(id, owner);
}
export async function processImport(id, dependencies = {}) {
  const parse = dependencies.parse || parseSpotifyPlaylist;
  const lookup = dependencies.lookup || fetchTrackMetadata;
  const read = () => db.prepare('SELECT * FROM playlist_imports WHERE id = ?').get(id);
  let job = read();
  if (!job || job.status === 'cancelled') return;
  try {
    db.prepare("UPDATE playlist_imports SET status = 'processing' WHERE id = ?").run(id);
    let tracks = JSON.parse(job.tracks_json);
    if (!tracks.length) {
      const parsed = await parse(job.input_url);
      tracks = parsed.songs.slice(0, 100);
      if (!tracks.length) throw new Error('No tracks were available. Check that the playlist is public.');
      db.prepare('UPDATE playlist_imports SET playlist_id = ?, playlist_name = ?, tracks_json = ? WHERE id = ?').run(parsed.playlistId, parsed.playlistName, JSON.stringify(tracks), id);
    }
    job = read();
    const processed = new Set(JSON.parse(job.processed_json));
    const ids = new Set(JSON.parse(job.song_ids_json));
    const queue = tracks.map((track, index) => ({ track, index })).filter(item => !processed.has(item.index));
    const worker = async () => {
      while (queue.length) {
        if (read()?.status !== 'processing') return;
        const { track, index } = queue.shift();
        let song = db.prepare('SELECT id FROM songs WHERE LOWER(title) = LOWER(?) AND LOWER(artist) = LOWER(?)').get(track.title, track.artist);
        if (!song) {
          const metadata = await lookup(track.title, track.artist);
          if (read()?.status !== 'processing') return;
          if (metadata?.preview_url) {
            db.prepare('INSERT INTO songs (title, artist, album, artwork_url, preview_url, source, source_track_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_track_id) DO UPDATE SET preview_url = excluded.preview_url').run(metadata.title, metadata.artist, metadata.album, metadata.artwork_url, metadata.preview_url, metadata.source, metadata.source_track_id);
            song = db.prepare('SELECT id FROM songs WHERE source_track_id = ?').get(metadata.source_track_id);
          }
        }
        if (song) ids.add(song.id);
        processed.add(index);
        db.prepare('UPDATE playlist_imports SET processed_json = ?, song_ids_json = ? WHERE id = ?').run(JSON.stringify([...processed]), JSON.stringify([...ids]), id);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (read()?.status !== 'processing') return;
    db.prepare('UPDATE playlist_imports SET status = ?, error = ? WHERE id = ?').run(ids.size ? 'complete' : 'failed', ids.size ? null : 'No matching previews were available for this playlist. Try another public playlist.', id);
  } catch (error) { if (read()?.status !== 'cancelled') db.prepare("UPDATE playlist_imports SET status = 'failed', error = ? WHERE id = ?").run(error.message, id); }
}
export function resumeImports() {
  const queued = db.prepare("SELECT id FROM playlist_imports WHERE status IN ('queued','processing') ORDER BY created_at").all();
  for (const job of queued) {
    if (running >= 2) break;
    if (active.has(job.id)) continue;
    active.add(job.id); running++;
    processImport(job.id).finally(() => { active.delete(job.id); running--; resumeImports(); });
  }
}
