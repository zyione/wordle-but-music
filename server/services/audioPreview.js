const normalize = value => String(value || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function isTrustedAudioUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      (url.hostname.endsWith('.dzcdn.net') || url.hostname.endsWith('.itunes.apple.com'));
  } catch { return false; }
}

export function isExpiredPreview(url, now = Date.now()) {
  const expires = String(url || '').match(/(?:^|[?~])(?:hdnea=)?exp=(\d+)/);
  return Boolean(expires && Number(expires[1]) * 1000 <= now + 30000);
}

export async function fetchAudio(url, { signal } = {}) {
  if (!isTrustedAudioUrl(url)) return null;
  try {
    const response = await fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { Accept: 'audio/*', 'User-Agent': 'SongGuesser/1.0' } });
    if (!response.ok || !/^(audio\/|application\/octet-stream)/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      return null;
    }
    return response;
  } catch { return null; }
}

async function json(url, signal) {
  try {
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(4000)]) : AbortSignal.timeout(4000), headers: { 'Cache-Control': 'no-cache' }, cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

export async function freshPreviewCandidates({ title, artist, source_track_id }, { signal } = {}) {
  const urls = [];
  if (/^\d+$/.test(String(source_track_id))) {
    const track = await json(`https://api.deezer.com/track/${source_track_id}?_=${Date.now()}`, signal);
    if (track?.preview && isTrustedAudioUrl(track.preview) && !isExpiredPreview(track.preview)) return [track.preview];
  }
  const query = encodeURIComponent(`${title} ${artist}`);
  const result = await json(`https://api.deezer.com/search?q=${query}&_=${Date.now()}`, signal);
  for (const track of result?.data || []) {
    if (normalize(track.title) === normalize(title) && normalize(track.artist?.name) === normalize(artist)) urls.push(track.preview);
  }
  return [...new Set(urls.filter(url => isTrustedAudioUrl(url) && !isExpiredPreview(url)))];
}

export async function fallbackPreviewCandidates({ title, artist }, { signal } = {}) {
  const result = await json(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&limit=15`, signal);
  return (result?.results || []).filter(track => normalize(track.trackName) === normalize(title) && normalize(track.artistName) === normalize(artist)).map(track => track.previewUrl).filter(isTrustedAudioUrl);
}
