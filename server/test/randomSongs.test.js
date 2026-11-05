import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSong, shuffleSongs, parseSongIds } from '../services/randomSongs.js';
const songs = [1, 2, 3, 4].map(id => ({ id, preview_url: 'preview' }));

test('every unplayed song is selectable and no played song is selected', () => {
  assert.equal(pickSong(songs, [1, 2], () => 0).song.id, 3);
  assert.equal(pickSong(songs, [1, 2], () => 1).song.id, 4);
  assert.equal(pickSong(songs, [], n => n - 1).song.id, 4);
});
test('exhausted cycles reset without immediately repeating the last song', () => {
  const result = pickSong(songs, [1, 2, 3, 4], n => n - 1);
  assert.equal(result.historyReset, true);
  assert.notEqual(result.song.id, 4);
  assert.equal(pickSong([songs[0]], [1]).song.id, 1);
  assert.equal(pickSong([], []).song, null);
});
test('party shuffle preserves each playable song exactly once', () => {
  const result = shuffleSongs([...songs, songs[0], { id: 99, preview_url: '' }], () => 0);
  assert.deepEqual(result.map(s => s.id).sort(), [1, 2, 3, 4]);
  assert.deepEqual(parseSongIds('1,abc,-1,2,1.2'), [1, 2]);
});
