import React, { useState } from 'react';
import { X, Music2, AlertCircle, Play, Trash2, ListMusic } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'song_guesser_cached_spotify_playlists';

function getCachedPlaylists() {
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

function deleteCachedPlaylist(playlistId) {
  const current = getCachedPlaylists();
  const updated = current.filter((p) => p.playlistId !== playlistId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export default function SpotifyModal({ onSelectCached, onStartImport, onClose }) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [error, setError] = useState(null);
  const [cachedPlaylists, setCachedPlaylists] = useState(getCachedPlaylists());

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!playlistUrl.trim()) return;

    if (onStartImport) {
      onStartImport(playlistUrl.trim());
      onClose();
    }
  };

  const handleSelectCachedItem = (playlist) => {
    onSelectCached(playlist);
    onClose();
  };

  const handleDeleteCached = (e, playlistId) => {
    e.stopPropagation();
    const updated = deleteCachedPlaylist(playlistId);
    setCachedPlaylists(updated);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Music2 size={24} color="#1db954" />
            <h2 className="modal-title">Spotify Playlist Mode</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Paste any public Spotify Playlist link to play songs chosen exclusively from your playlist!
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              className="search-input"
              placeholder="e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
            />

            <button
              type="submit"
              className="btn-submit"
              style={{
                background: '#1db954',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                width: '100%',
                height: 46,
                boxShadow: '0 4px 14px rgba(29, 185, 84, 0.4)'
              }}
              disabled={!playlistUrl.trim()}
            >
              Import & Start Playlist
            </button>
          </form>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 8 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* CACHED / RECENT PLAYLISTS SECTION */}
          {cachedPlaylists.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>
                <ListMusic size={15} color="#1db954" />
                <span>PREVIOUSLY IMPORTED PLAYLISTS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {cachedPlaylists.map((pl) => (
                  <div
                    key={pl.playlistId}
                    onClick={() => handleSelectCachedItem(pl)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29, 185, 84, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#1db954', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Play size={16} fill="#fff" />
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pl.playlistName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {pl.importedTracksCount || pl.songIds?.length} songs available
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteCached(e, pl.playlistId)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}
                      title="Delete cached playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
