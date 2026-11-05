import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'song-guesser-import-test-'));
process.env.DISABLE_CLOUD_BACKUP = '1';
process.env.DB_PATH = path.join(directory, 'test.db');
const { default: db } = await import('../db/db.js');
const { migrate } = await import('../db/migrate.js');
const { processImport, ownedImport } = await import('../services/playlistImports.js');
migrate();
after(async () => { await db.close(); rmSync(directory, { recursive: true }); });

test('the first songs are playable while later songs are still importing', async () => {
  const songs = [1, 2, 3, 4].map(id => ({ title: `Song ${id}`, artist: 'Artist' }));
  for (const track of songs.slice(0, 3)) db.prepare('INSERT INTO songs (title, artist, preview_url) VALUES (?, ?, ?)').run(track.title, track.artist, 'https://a.dzcdn.net/test.mp3');
  db.prepare('INSERT INTO playlist_imports (id, owner_id, input_url, created_at) VALUES (?, ?, ?, ?)').run('job', 'owner', 'playlist', Date.now());
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const work = processImport('job', {
    parse: async () => ({ playlistId: 'playlist', playlistName: 'Test playlist', songs }),
    lookup: async (title, artist) => { await gate; return { title, artist, album: '', artwork_url: '', preview_url: 'https://a.itunes.apple.com/song.m4a', source: 'itunes', source_track_id: 'itunes_4' }; },
  });
  await new Promise(setImmediate);
  const early = ownedImport('job', 'owner');
  assert.equal(early.readyCount, 3);
  assert.equal(early.isImporting, true);
  assert.equal(early.current, 3);
  assert.throws(() => ownedImport('job', 'other'), /not found/);
  release(); await work;
  assert.equal(ownedImport('job', 'owner').readyCount, 4);
  assert.equal(ownedImport('job', 'owner').isComplete, true);
  // Restarting a completed job does not duplicate songs or reprocess lookups.
  await processImport('job', { lookup: () => { throw new Error('Unexpected lookup'); } });
  assert.equal(ownedImport('job', 'owner').readyCount, 4);
});
