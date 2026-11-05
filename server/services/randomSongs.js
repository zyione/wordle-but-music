import { randomInt } from 'node:crypto';

export function shuffleSongs(songs, draw = randomInt) {
  const shuffled = [...new Map(songs.filter(s => s.preview_url).map(s => [s.id, s])).values()];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = draw(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pickSong(songs, history = [], draw = randomInt) {
  const pool = [...new Map(songs.filter(s => s.preview_url).map(s => [s.id, s])).values()];
  const excludes = new Set(history);
  let candidates = pool.filter(s => !excludes.has(s.id));
  const historyReset = candidates.length === 0 && pool.length > 0;
  if (historyReset) candidates = pool.length > 1 ? pool.filter(s => s.id !== history.at(-1)) : pool;
  return { song: candidates.length ? candidates[draw(candidates.length)] : null, historyReset };
}

export function parseSongIds(value) {
  return String(value || '').split(',').map(Number).filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 10000);
}

export async function pickPlayableSong(songs, history, previews, draw = randomInt) {
  const pool = songs.filter(song => !previews.isUnavailable(song.id));
  const excluded = new Set(history);
  let candidates = pool.filter(song => !excluded.has(song.id));
  const historyReset = candidates.length === 0 && pool.length > 0;
  if (historyReset) candidates = pool.length > 1 ? pool.filter(song => song.id !== history.at(-1)) : pool;
  const sample = shuffleSongs(candidates, draw).slice(0, 3);
  const validated = await Promise.all(sample.map(async song => await previews.resolve(song.id) ? song : null));
  const ready = validated.filter(Boolean);
  return { song: ready.length ? ready[draw(ready.length)] : null, historyReset };
}
