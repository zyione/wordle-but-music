import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAudioType, readPreview, createPreviewStore } from '../services/previewPlayback.js';
import { pickPlayableSong } from '../services/randomSongs.js';
const aac = () => { const data = Buffer.alloc(80); data.write('ftyp', 4); data.write('M4A ', 8); data.write('mp4a', 40); return data; };
const response = () => new Response(aac(), { headers: { 'content-type': 'audio/x-m4p' } });

test('unencrypted AAC is served as supported MP4 regardless of the CDN label', async () => {
  assert.equal((await readPreview(response())).contentType, 'audio/mp4');
  const encrypted = aac(); encrypted.write('enca', 48);
  assert.equal(detectAudioType(encrypted), null);
  assert.equal(detectAudioType(Buffer.from('<html>not actually an audio preview</html>')), null);
  assert.equal(detectAudioType(Buffer.from('ID3' + 'x'.repeat(40))), 'audio/mpeg');
});

test('expired sources recover once and concurrent playback uses validated cached bytes', async () => {
  let downloads = 0, saved;
  const store = createPreviewStore({
    lookupSong: id => ({ id, preview_url: 'https://a.dzcdn.net/a?hdnea=exp=1~acl=all' }),
    saveUrl: (id, url) => { saved = [id, url]; },
    fresh: async () => ['https://a.dzcdn.net/broken.mp3'],
    fallback: async () => ['https://a.itunes.apple.com/good.m4a'],
    fetchClip: async url => { downloads++; return url.includes('good') ? response() : null; },
  });
  const [first, second] = await Promise.all([store.resolve(1), store.resolve(1)]);
  assert.equal(first.contentType, 'audio/mp4');
  assert.equal(second, first);
  assert.equal(downloads, 2);
  await store.resolve(1);
  assert.equal(downloads, 2);
  assert.deepEqual(saved, [1, 'https://a.itunes.apple.com/good.m4a']);
});

test('unavailable clips are quarantined and bounded caching evicts old audio', async () => {
  let now = 1000000, downloads = 0;
  const store = createPreviewStore({
    lookupSong: id => ({ id, preview_url: `https://a.dzcdn.net/${id}.mp3` }), saveUrl() {},
    fetchClip: async url => { downloads++; return url.includes('/9.') ? null : response(); },
    fresh: async () => [], fallback: async () => [], now: () => now, maxBytes: 80,
  });
  assert.equal(await store.resolve(9), null);
  assert.equal(store.isUnavailable(9), true);
  const count = downloads; await store.resolve(9); assert.equal(downloads, count);
  await store.resolve(1); await store.resolve(2); await store.resolve(1);
  assert.equal(downloads, count + 3);
  now += 5 * 60000 + 1;
  assert.equal(store.isUnavailable(9), false);
});

test('random games only select a clip after readiness verification and preserve history', async () => {
  const songs = [1, 2, 3, 4].map(id => ({ id, preview_url: 'preview' }));
  const checked = [];
  const result = await pickPlayableSong(songs, [1], { isUnavailable: id => id === 2, resolve: async id => { checked.push(id); return id === 3 ? {} : null; } }, () => 0);
  assert.equal(result.song.id, 3);
  assert.equal(checked.includes(1), false);
  assert.equal(checked.includes(2), false);
});
