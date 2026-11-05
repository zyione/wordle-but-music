import { fetchAudio, freshPreviewCandidates, fallbackPreviewCandidates, isExpiredPreview } from './audioPreview.js';

export function detectAudioType(buffer) {
  // Apple's preview CDN sometimes labels ordinary unencrypted AAC as x-m4p.
  // Use the actual container so browsers receive a supported media type.
  if (buffer.length < 16) return null;
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const header = buffer.subarray(0, Math.min(buffer.length, 65536));
    return header.includes(Buffer.from('mp4a')) && !header.includes(Buffer.from('enca')) ? 'audio/mp4' : null;
  }
  if (buffer.toString('ascii', 0, 3) === 'ID3' || buffer[0] === 255 && (buffer[1] & 224) === 224) return 'audio/mpeg';
  if (buffer.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE') return 'audio/wav';
  return null;
}

export async function readPreview(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2 * 1024 * 1024) throw new Error('Preview exceeds size limit');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const buffer = Buffer.concat(chunks);
  const contentType = detectAudioType(buffer);
  return contentType ? { buffer, contentType } : null;
}

export function createPreviewStore({ lookupSong, saveUrl, fetchClip = fetchAudio, fresh = freshPreviewCandidates, fallback = fallbackPreviewCandidates, now = Date.now, maxBytes = 32 * 1024 * 1024 }) {
  const cache = new Map(), inFlight = new Map(), unavailable = new Map();
  let bytes = 0;
  const remove = id => { const old = cache.get(id); if (old) bytes -= old.buffer.length; cache.delete(id); };
  const isUnavailable = id => (unavailable.get(id) || 0) > now();
  const resolve = async (id, { refresh = false } = {}) => {
    const cached = cache.get(id);
    if (cached && cached.expires > now() && !refresh) { cache.delete(id); cache.set(id, cached); return cached; }
    if (cached) remove(id);
    if (inFlight.has(id)) return inFlight.get(id);
    if (!refresh && isUnavailable(id)) return null;
    const work = (async () => {
      const song = lookupSong(id);
      if (!song) return null;
      const signal = AbortSignal.timeout(12000);
      const tried = new Set();
      const tryUrl = async url => {
        if (!url || tried.has(url) || signal.aborted) return null;
        tried.add(url);
        const response = await fetchClip(url, { signal });
        if (!response) return null;
        try { const clip = await readPreview(response); return clip ? { ...clip, url } : null; } catch { return null; }
      };
      let clip = !refresh && !isExpiredPreview(song.preview_url) ? await tryUrl(song.preview_url) : null;
      for (const provider of [fresh, fallback]) {
        if (clip || signal.aborted) break;
        for (const url of await provider(song, { signal })) { clip = await tryUrl(url); if (clip) break; }
      }
      if (!clip) { unavailable.set(id, now() + 5 * 60000); return null; }
      unavailable.delete(id);
      if (clip.url !== song.preview_url) saveUrl(id, clip.url);
      while (cache.size && bytes + clip.buffer.length > maxBytes) remove(cache.keys().next().value);
      const entry = { ...clip, expires: now() + 30 * 60000 };
      if (entry.buffer.length <= maxBytes) { cache.set(id, entry); bytes += entry.buffer.length; }
      return entry;
    })();
    inFlight.set(id, work);
    try { return await work; } finally { inFlight.delete(id); }
  };
  return { resolve, isUnavailable };
}
