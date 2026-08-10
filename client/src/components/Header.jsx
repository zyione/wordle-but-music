import React from 'react';
import { Music2, HelpCircle, BarChart2, Calendar, Infinity as InfinityIcon, Disc, PlusCircle } from 'lucide-react';

export default function Header({ gameMode, onToggleMode, onOpenHelp, onOpenStats, onOpenSpotifyModal, activePlaylistName }) {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-icon">
          <Music2 size={22} />
        </div>
        <div>
          <h1 className="app-title">Song Guesser</h1>
          {gameMode === 'spotify' && activePlaylistName && (
            <button
              onClick={onOpenSpotifyModal}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.72rem',
                color: '#1db954',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: -2,
                cursor: 'pointer',
                padding: 0
              }}
              title="Click to switch or import another Spotify playlist"
            >
              <span>🎧 {activePlaylistName}</span>
              <span style={{ fontSize: '0.65rem', textDecoration: 'underline', opacity: 0.8 }}>(Switch)</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Segmented Control */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.06)',
        padding: 3,
        borderRadius: 20,
        border: '1px solid var(--bg-card-border)',
        gap: 2
      }}>
        <button
          onClick={() => gameMode !== 'daily' && onToggleMode('daily')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 16,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: gameMode === 'daily' ? 'var(--accent-primary)' : 'transparent',
            color: gameMode === 'daily' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          <Calendar size={13} />
          <span>Daily</span>
        </button>

        <button
          onClick={() => gameMode !== 'unlimited' && onToggleMode('unlimited')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 16,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: gameMode === 'unlimited' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'transparent',
            color: gameMode === 'unlimited' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s ease'
          }}
        >
          <InfinityIcon size={13} />
          <span>Unlimited</span>
        </button>

        <button
          onClick={() => onToggleMode('spotify')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 16,
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: gameMode === 'spotify' ? '#1db954' : 'transparent',
            color: gameMode === 'spotify' ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s ease'
          }}
          title={gameMode === 'spotify' ? 'Click to import or choose another Spotify playlist' : 'Spotify Playlist Mode'}
        >
          <Disc size={13} />
          <span>Spotify</span>
          {gameMode === 'spotify' && <PlusCircle size={12} style={{ marginLeft: 2 }} />}
        </button>
      </div>

      <div className="nav-actions">
        <button className="icon-btn" onClick={onOpenHelp} title="How to Play" aria-label="Help">
          <HelpCircle size={20} />
        </button>
        <button className="icon-btn" onClick={onOpenStats} title="Statistics" aria-label="Stats">
          <BarChart2 size={20} />
        </button>
      </div>
    </header>
  );
}
