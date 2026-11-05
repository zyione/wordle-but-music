import { getCachedPlaylists, deleteCachedPlaylist } from '../lib/playlistCache.js';
import useDialog from '../hooks/useDialog.js';
import React, { useState } from 'react';
import { X, Music2, AlertCircle, Play, Trash2, ListMusic } from 'lucide-react';

export default function SpotifyModal({ onSelectCached, onStartImport, onClose }) {
  const dialogRef = useDialog(onClose);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cachedPlaylists, setCachedPlaylists] = useState(getCachedPlaylists());

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!playlistUrl.trim() || submitting) return;
    setError(null);
    if (!/playlist\/[A-Za-z0-9]+|^[A-Za-z0-9]+$/.test(playlistUrl.trim())) { setError('Enter a public Spotify playlist link.'); return; }

    if (onStartImport) {
      setSubmitting(true);
      try {
        const result = await onStartImport(playlistUrl.trim());
        if (result?.error) setError(result.error);
        else onClose();
      } finally { setSubmitting(false); }
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
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Spotify" className="modal-card" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Music2 size={24} color="#1db954" />
            <h2 className="modal-title">Spotify Playlist Mode</h2>
          </div>
          <button className="close-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Paste a public Spotify playlist. Play as soon as the first songs are ready while the rest import in the background.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              className="search-input"
              aria-label="Public Spotify playlist URL"
              placeholder="e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
            />

            <button
              type="submit"
              className="btn-submit spotify-import-button"
              style={{
                background: '#1db954',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.95rem',
                width: '100%',
                height: 46,
                boxShadow: '0 4px 14px rgba(29, 185, 84, 0.4)'
              }}
              disabled={!playlistUrl.trim() || submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Starting import…' : 'Import & Start Playlist'}
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
                    <button type="button" onClick={() => handleSelectCachedItem(pl)} style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1, textAlign: 'left', color: 'inherit', background: 'transparent', border: 0, minHeight: 44 }}>
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
                    </button>

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
