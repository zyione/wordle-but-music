import React, { useState } from 'react';
import { X, Music2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SpotifyModal({ onImportSuccess, onClose, apiBaseUrl = 'http://localhost:4000' }) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const handleImport = async (e) => {
    e?.preventDefault();
    if (!playlistUrl.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      setImportResult(null);

      const res = await fetch(`${apiBaseUrl}/api/spotify/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: playlistUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import playlist');
      }

      setImportResult(data);
    } catch (err) {
      console.error('Spotify import error:', err);
      setError(err.message || 'Failed to import Spotify playlist.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlaying = () => {
    if (importResult) {
      onImportSuccess(importResult);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Music2 size={24} color="#1db954" />
            <h2 className="modal-title">Spotify Playlist Mode</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Paste any public Spotify Playlist link below. We will extract the tracklist and load audio previews via Deezer so you can play your custom playlist!
          </p>

          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              className="search-input"
              placeholder="e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              className="btn-submit"
              style={{ background: '#1db954', width: '100%', height: 46 }}
              disabled={loading || !playlistUrl.trim()}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={18} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Importing Playlist Tracks...</span>
                </div>
              ) : (
                'Import Spotify Playlist'
              )}
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
                style={{ background: 'linear-gradient(135deg, #1db954, #059669)', width: '100%' }}
              >
                Start Playing This Playlist 🎧
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
