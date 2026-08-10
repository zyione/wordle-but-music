import React, { useState } from 'react';
import { X, Music2, CheckCircle2, AlertCircle, Loader2, Play, Trash2, ListMusic } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'song_guesser_cached_spotify_playlists';

function getCachedPlaylists() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedPlaylist(playlistData) {
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

export default function SpotifyModal({ onImportSuccess, onClose, apiBaseUrl = 'http://localhost:4000' }) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, status: 'Parsing Spotify playlist...', trackInfo: '' });
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [cachedPlaylists, setCachedPlaylists] = useState(getCachedPlaylists());

  const handleImport = async (e) => {
    e?.preventDefault();
    if (!playlistUrl.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      setImportResult(null);
      setProgress({ current: 0, total: 0, percent: 0, status: 'Connecting to Spotify...', trackInfo: '' });

      const response = await fetch(`${apiBaseUrl}/api/spotify/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let completedData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep leftover partial line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === 'init') {
              setProgress({
                current: 0,
                total: msg.total,
                percent: 0,
                status: `Importing "${msg.playlistName}"...`,
                trackInfo: `Preparing to process ${msg.total} tracks`
              });
            } else if (msg.type === 'progress') {
              const pct = Math.round((msg.current / msg.total) * 100);
              setProgress({
                current: msg.current,
                total: msg.total,
                percent: pct,
                status: `Track ${msg.current} of ${msg.total}`,
                trackInfo: `Matching "${msg.title}" by ${msg.artist}`
              });
            } else if (msg.type === 'error') {
              throw new Error(msg.error || 'Import error');
            } else if (msg.type === 'complete') {
              completedData = msg;
              setImportResult(msg);
              const updatedCache = saveCachedPlaylist(msg);
              setCachedPlaylists(updatedCache);
            }
          } catch (lineErr) {
            console.warn('Error parsing stream line:', lineErr);
          }
        }
      }

      if (completedData) {
        setTimeout(() => {
          onImportSuccess(completedData);
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error('Spotify import error:', err);
      setError(err.message || 'Failed to import Spotify playlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCached = (playlist) => {
    onImportSuccess(playlist);
    onClose();
  };

  const handleDeleteCached = (e, playlistId) => {
    e.stopPropagation();
    const updated = deleteCachedPlaylist(playlistId);
    setCachedPlaylists(updated);
  };

  const handleStartPlaying = () => {
    if (importResult) {
      onImportSuccess(importResult);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Music2 size={24} color="#1db954" />
            <h2 className="modal-title">Spotify Playlist Mode</h2>
          </div>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {/* LIVE PROGRESS LOADING SCREEN STATE */}
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            gap: 20,
            textAlign: 'center'
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: 76,
                height: 76,
                borderRadius: '50%',
                background: 'rgba(29, 185, 84, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(29, 185, 84, 0.3)'
              }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1db954' }}>
                  {progress.percent}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
                {progress.total ? `Processing Track ${progress.current} of ${progress.total}` : 'Connecting to Spotify...'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#1db954', fontWeight: 600, minHeight: 20 }}>
                {progress.trackInfo || progress.status}
              </p>
            </div>

            {/* Live Filling Progress Bar */}
            <div style={{
              width: '100%',
              height: 10,
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 6,
              overflow: 'hidden',
              marginTop: 4,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(5, progress.percent)}%`,
                background: 'linear-gradient(90deg, #1db954, #10b981)',
                borderRadius: 6,
                transition: 'width 0.25s ease-out',
                boxShadow: '0 0 12px rgba(29, 185, 84, 0.5)'
              }} />
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              Fetching 30s audio previews and artwork via Deezer CDN...
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Paste any public Spotify Playlist link to play songs chosen exclusively from your playlist!
            </p>

            <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

            {importResult && (
              <div style={{ background: 'rgba(29, 185, 84, 0.12)', border: '1px solid rgba(29, 185, 84, 0.3)', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={22} color="#1db954" />
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#fff' }}>{importResult.playlistName}</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Successfully imported {importResult.importedTracksCount} playable songs!
                    </p>
                  </div>
                </div>

                <button
                  className="btn-submit"
                  onClick={handleStartPlaying}
                  style={{ background: 'linear-gradient(135deg, #1db954, #059669)', color: '#ffffff', fontWeight: 800, width: '100%' }}
                >
                  Start Playing This Playlist 🎧
                </button>
              </div>
            )}

            {/* CACHED / RECENT PLAYLISTS SECTION */}
            {cachedPlaylists.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 700 }}>
                  <ListMusic size={15} color="#1db954" />
                  <span>PREVIOUSLY IMPORTED PLAYLISTS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {cachedPlaylists.map((pl) => (
                    <div
                      key={pl.playlistId}
                      onClick={() => handleSelectCached(pl)}
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
        )}
      </div>
    </div>
  );
}
