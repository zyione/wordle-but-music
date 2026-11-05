import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import useAudioPlayback from '../src/hooks/useAudioPlayback.js';
const data = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } });
globalThis.window = new EventTarget();
window.location = { href: 'http://localhost/' };
class AudioMock extends EventTarget {
  currentTime = 0; error = null; loads = 0; plays = 0; paused = true; src = '';
  load() { this.loads++; this.error = null; }
  pause() { this.paused = true; }
  async play() { this.plays++; this.paused = false; }
}
let hook;
function Harness({ onUnavailable }) {
  hook = useAudioPlayback({ source: 'https://example.test/api/audio/proxy?songId=1', limitMs: 1000, onUnavailable });
  return React.createElement('audio', { ref: hook.audioRef });
}

test('media errors refresh automatically, resume user playback, and keep the snippet limit', async () => {
  const audio = new AudioMock();
  let renderer;
  await act(async () => { renderer = create(React.createElement(Harness), { createNodeMock: () => audio }); });
  await act(async () => { hook.togglePlay(); });
  assert.equal(hook.isPlaying, true);
  await act(async () => { audio.error = { code: 4 }; audio.dispatchEvent(new Event('error')); });
  assert.equal(audio.loads, 1);
  assert.match(audio.src, /refresh=1/);
  assert.equal(hook.audioError, null);
  await act(async () => { audio.dispatchEvent(new Event('canplay')); });
  assert.equal(audio.plays, 2);
  assert.equal(hook.isPlaying, true);
  await act(async () => { audio.currentTime = 1.1; audio.dispatchEvent(new Event('timeupdate')); });
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 0);
  await act(async () => renderer.unmount());
});

test('a persistently bad clip requests one replacement, without an endless retry loop', async () => {
  const audio = new AudioMock();
  let renderer, replacements = 0;
  await act(async () => { renderer = create(React.createElement(Harness, { onUnavailable: () => { replacements++; return true; } }), { createNodeMock: () => audio }); });
  await act(async () => { audio.dispatchEvent(new Event('error')); });
  await act(async () => { audio.dispatchEvent(new Event('error')); audio.dispatchEvent(new Event('error')); });
  assert.equal(replacements, 1);
  assert.equal(audio.loads, 1);
  await act(async () => renderer.unmount());
});
