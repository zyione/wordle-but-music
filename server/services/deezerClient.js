/**
 * Service to interact with public Deezer API
 */

export async function searchDeezerTrack(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    // Add 4-second AbortSignal timeout to prevent hanging on dropped network requests
    const response = await fetch(`https://api.deezer.com/search?q=${encodedQuery}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) {
      throw new Error(`Deezer API HTTP error: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error(`Error searching Deezer for "${query}":`, error.message);
    return [];
  }
}

export async function fetchTrackMetadata(title, artist) {
  let results = await searchDeezerTrack(`${title} ${artist}`);

  if (!results.length) {
    // Try title only fallback
    results = await searchDeezerTrack(title);
  }

  if (!results.length) {
    return fetchAppleMetadata(title, artist);
  }

  // Find best candidate with valid preview
  const candidate = results.find(t => t.preview && sameTrack(t.title, t.artist?.name, title, artist));

  if (!candidate || !candidate.preview) {
    return fetchAppleMetadata(title, artist);
  }

  return {
    source_track_id: String(candidate.id),
    title: candidate.title || title,
    artist: candidate.artist?.name || artist,
    album: candidate.album?.title || '',
    artwork_url: candidate.album?.cover_big || candidate.album?.cover_medium || '',
    preview_url: candidate.preview,
    source: 'deezer'
  };
}

const normalize = value => String(value || '').normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const sameTrack = (title, artist, expectedTitle, expectedArtist) => normalize(title) === normalize(expectedTitle) && normalize(artist) === normalize(expectedArtist);
export async function fetchAppleMetadata(title, artist) {
  try {
    const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${artist}`)}&entity=song&limit=15`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    const track = data.results?.find(t => t.previewUrl && sameTrack(t.trackName, t.artistName, title, artist));
    return track ? { title: track.trackName, artist: track.artistName, album: track.collectionName || '', artwork_url: track.artworkUrl100?.replace('100x100', '600x600') || '', preview_url: track.previewUrl, source: 'itunes', source_track_id: `itunes_${track.trackId}` } : null;
  } catch { return null; }
}
