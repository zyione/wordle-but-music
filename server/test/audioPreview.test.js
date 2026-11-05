import test from 'node:test';
import assert from 'node:assert/strict';
import { isTrustedAudioUrl, isExpiredPreview, fetchAudio, freshPreviewCandidates, fallbackPreviewCandidates } from '../services/audioPreview.js';

test('only approved HTTPS audio hosts can be fetched', () => {
  assert.equal(isTrustedAudioUrl('https://cdnt-preview.dzcdn.net/audio.mp3'), true);
  for (const url of ['http://localhost/', 'https://evil.test/', 'https://dzcdn.net.evil.test/a', 'https://user:pass@a.dzcdn.net/a', 'https://a.dzcdn.net:4000/a']) assert.equal(isTrustedAudioUrl(url), false);
});

test('expired signed previews are not reused', () => {
  assert.equal(isExpiredPreview('https://a.dzcdn.net/a?hdnea=exp=100~acl=abc', 200000), true);
  assert.equal(isExpiredPreview('https://a.dzcdn.net/a?hdnea=exp=500~acl=abc', 200000), false);
});

test('bad media is released; fresh lookup matches title and artist', async () => {
  const original = globalThis.fetch;
  let canceled = false;
  globalThis.fetch = async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }), body: { cancel: async () => { canceled = true; } } });
  try {
    assert.equal(await fetchAudio('https://a.dzcdn.net/a'), null);
    assert.equal(canceled, true);
    globalThis.fetch = async () => Response.json({ data: [
      { title: 'Song', artist: { name: 'Artist' }, preview: 'https://a.dzcdn.net/good.mp3' },
      { title: 'Other', artist: { name: 'Artist' }, preview: 'https://a.dzcdn.net/wrong.mp3' },
    ] });
    assert.deepEqual(await freshPreviewCandidates({ title: 'Song', artist: 'Artist' }), ['https://a.dzcdn.net/good.mp3']);
    globalThis.fetch = async () => Response.json({ results: [
      { trackName: 'Song', artistName: 'Wrong artist', previewUrl: 'https://a.itunes.apple.com/wrong.m4a' },
      { trackName: 'Song', artistName: 'Artist', previewUrl: 'https://a.itunes.apple.com/good.m4a' },
    ] });
    assert.deepEqual(await fallbackPreviewCandidates({ title: 'Song', artist: 'Artist' }), ['https://a.itunes.apple.com/good.m4a']);
  } finally { globalThis.fetch = original; }
});
