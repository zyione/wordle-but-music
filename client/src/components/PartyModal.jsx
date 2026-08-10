import React, { useState } from 'react';
import { X, Users, Play, PlusCircle, Disc, Shuffle, Link as LinkIcon, Loader2 } from 'lucide-react';

export default function PartyModal({ onCreateParty, onJoinParty, onClose }) {
  const [activeTab, setActiveTab] = useState('join'); // 'join' | 'create'
  const [joinCode, setJoinCode] = useState('');

  // Create form state
  const [numRounds, setNumRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [songSource, setSongSource] = useState('random'); // 'random' | 'spotify'
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) return;

    try {
      setLoading(true);
      setError(null);
      await onJoinParty(clean);
    } catch (err) {
      setError(err.message || 'Failed to join party');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onCreateParty({
        numRounds,
        maxPlayers,
        songSource,
        playlistUrl: songSource === 'spotify' ? playlistUrl.trim() : null
      });
    } catch (err) {
      setError(err.message || 'Failed to create party room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} color="#ec4899" />
            <h2 className="modal-title">Party Versus Mode</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: 4,
          borderRadius: 16,
          gap: 4,
          margin: '12px 0'
        }}>
          <button
            onClick={() => { setActiveTab('join'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'join' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'transparent',
              color: activeTab === 'join' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            Join Party
          </button>

          <button
            onClick={() => { setActiveTab('create'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'create' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'transparent',
              color: activeTab === 'create' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            Create Party
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: '0.82rem',
            marginBottom: 12
          }}>
            {error}
          </div>
        )}

        {/* JOIN PARTY TAB */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                Enter Party Code
              </label>
              <input
                type="text"
                className="search-input"
                placeholder="e.g. ABCD12"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                style={{
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  letterSpacing: '4px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '12px',
                  borderRadius: 12
                }}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={loading || joinCode.length < 4}
              style={{
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                padding: '12px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1.2s linear infinite' }} /> : <Play size={18} />}
              <span>Join Room</span>
            </button>
          </form>
        )}

        {/* CREATE PARTY TAB */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Rounds Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                <label style={{ fontWeight: 600 }}>Number of Rounds</label>
                <span style={{ fontWeight: 800, color: '#ec4899' }}>{numRounds} songs</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={numRounds}
                onChange={(e) => setNumRounds(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Song Source Choice */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Song Pool Source
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSongSource('random')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px',
                    borderRadius: 10,
                    border: songSource === 'random' ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)',
                    background: songSource === 'random' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Shuffle size={16} />
                  <span>Random Songs</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSongSource('spotify')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px',
                    borderRadius: 10,
                    border: songSource === 'spotify' ? '2px solid #1db954' : '1px solid rgba(255,255,255,0.1)',
                    background: songSource === 'spotify' ? 'rgba(29, 185, 84, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Disc size={16} />
                  <span>Spotify Link</span>
                </button>
              </div>
            </div>

            {/* Optional Spotify Link Input */}
            {songSource === 'spotify' && (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Spotify Playlist URL:
                </label>
                <input
                  type="url"
                  className="search-input"
                  placeholder="https://open.spotify.com/playlist/..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  required={songSource === 'spotify'}
                  style={{ fontSize: '0.85rem', padding: '10px 14px' }}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={loading || (songSource === 'spotify' && !playlistUrl.trim())}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                padding: '12px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 4
              }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1.2s linear infinite' }} /> : <PlusCircle size={18} />}
              <span>Create Room (Code Generator)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
