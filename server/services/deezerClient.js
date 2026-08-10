/**
 * Service to interact with public Deezer API
 */

export async function searchDeezerTrack(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.deezer.com/search?q=${encodedQuery}`);
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
    return null;
  }

  // Find best candidate with valid preview
  const candidate = results.find(t => t.preview) || results[0];

  if (!candidate || !candidate.preview) {
    return null;
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
