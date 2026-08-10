/**
 * Service to parse public Spotify playlists without requiring developer API keys.
 */

export async function parseSpotifyPlaylist(playlistUrlOrId) {
  if (!playlistUrlOrId) {
    throw new Error('Playlist URL or ID is required');
  }

  // Extract playlist ID from standard URL, mobile share link, or raw ID
  const match = playlistUrlOrId.match(/playlist\/([a-zA-Z0-9]+)/) || playlistUrlOrId.match(/^([a-zA-Z0-9]+)$/);
  const playlistId = match ? match[1] : null;

  if (!playlistId) {
    throw new Error('Invalid Spotify playlist URL or ID. Example format: https://open.spotify.com/playlist/...');
  }

  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;

  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Spotify playlist (HTTP ${res.status})`);
  }

  const html = await res.text();

  // Parse __NEXT_DATA__ JSON from Spotify embed HTML
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!nextDataMatch) {
    throw new Error('Could not parse Spotify playlist structure');
  }

  const payload = JSON.parse(nextDataMatch[1]);
  const entity = payload.props?.pageProps?.state?.data?.entity;

  if (!entity) {
    throw new Error('Spotify playlist data not found or playlist is private.');
  }

  const playlistName = entity.name || 'Spotify Playlist';
  const trackList = entity.trackList || [];

  const songs = trackList.map(t => {
    // Clean up artist subtitle string (removing non-breaking spaces if any)
    const rawArtist = t.subtitle || (t.artists && t.artists[0] ? t.artists[0].name : '');
    const artist = rawArtist.replace(/\u00a0/g, ' ').split(',')[0].trim(); // take primary artist
    return {
      title: (t.title || t.name || '').trim(),
      artist
    };
  }).filter(s => s.title && s.artist);

  return {
    playlistName,
    playlistId,
    songsCount: songs.length,
    songs
  };
}
