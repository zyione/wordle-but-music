import React from 'react';
import { Music2, HelpCircle, BarChart2, Calendar, Infinity as InfinityIcon, Disc } from 'lucide-react';

export default function Header({ gameMode, onToggleMode, onOpenHelp, onOpenStats, activePlaylistName }) {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-icon">
          <Music2 size={22} />
        </div>
        <div>
          <h1 className="app-title">Song Guesser</h1>
          {gameMode === 'spotify' && activePlaylistName && (
            <span style={{ fontSize: '0.72rem', color: '#1db954', fontWeight: 600, display: 'block', marginTop: -2 }}>
              🎧 {activePlaylistName}
            </span>
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
        >
          <Disc size={13} />
          <span>Spotify</span>
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
