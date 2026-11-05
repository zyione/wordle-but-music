const LOCAL_STORAGE_KEY = 'song_guesser_cached_spotify_playlists';

export function getCachedPlaylists() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCachedPlaylist(playlistData) {
  const current = getCachedPlaylists();
  const updated = [
    {
      ...playlistData,
      importedAt: new Date().toISOString()
    },
    ...current.filter((p) => p.playlistId !== playlistData.playlistId)
  ];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteCachedPlaylist(playlistId) {
  const current = getCachedPlaylists();
  const updated = current.filter((p) => p.playlistId !== playlistId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

