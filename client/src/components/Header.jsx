import React from 'react';
import { Music2, HelpCircle, BarChart2, Calendar, Infinity as InfinityIcon, Disc, PlusCircle, Trophy, Users } from 'lucide-react';

export default function Header({
  gameMode,
  onToggleMode,
  onOpenHelp,
  onOpenStats,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenPartyModal,
  onOpenSpotifyModal,
  activePlaylistName,
  userProfile
}) {
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
                color: '#3b82f6',
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

      {/* Mode Switcher Pill Segmented Control (Gamee Style) */}
      <div className="mode-switcher-container">
        <button
          onClick={() => gameMode !== 'daily' && onToggleMode('daily')}
          className={`mode-btn ${gameMode === 'daily' ? 'active' : ''}`}
        >
          <Calendar size={13} style={{ flexShrink: 0 }} />
          <span>Daily</span>
        </button>

        <button
          onClick={() => gameMode !== 'unlimited' && onToggleMode('unlimited')}
          className={`mode-btn ${gameMode === 'unlimited' ? 'active-blue' : ''}`}
        >
          <InfinityIcon size={13} style={{ flexShrink: 0 }} />
          <span>Unlimited</span>
        </button>

        <button
          onClick={() => onToggleMode('spotify')}
          className={`mode-btn ${gameMode === 'spotify' ? 'active-green' : ''}`}
          title={gameMode === 'spotify' ? 'Click to import or choose another Spotify playlist' : 'Spotify Playlist Mode'}
        >
          <Disc size={13} style={{ flexShrink: 0 }} />
          <span>Spotify</span>
          {gameMode === 'spotify' && <PlusCircle size={12} style={{ marginLeft: 2, flexShrink: 0 }} />}
        </button>

        <button
          onClick={() => onToggleMode('party')}
          className={`mode-btn ${gameMode === 'party' ? 'active-pink' : ''}`}
          title="Party Versus Mode (Play together)"
        >
          <Users size={13} style={{ flexShrink: 0 }} />
          <span>Party 🎉</span>
        </button>
      </div>

      <div className="nav-actions">
        <button className="icon-btn" onClick={onOpenLeaderboard} title="Leaderboard" aria-label="Leaderboard">
          <Trophy size={20} color="#f59e0b" />
        </button>
        <button className="icon-btn" onClick={onOpenHelp} title="How to Play" aria-label="Help">
          <HelpCircle size={20} />
        </button>
        <button className="icon-btn" onClick={onOpenStats} title="Statistics" aria-label="Stats">
          <BarChart2 size={20} />
        </button>

        {/* User Profile Avatar Circle */}
        <button
          className="icon-btn"
          onClick={onOpenProfile}
          title={userProfile?.displayName ? `Profile: ${userProfile.displayName}` : 'Set Profile Name'}
          style={{ padding: 0, border: 'none', background: 'transparent' }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: userProfile?.avatarColor || '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: '#fff',
            fontSize: '0.88rem',
            boxShadow: `0 4px 12px ${userProfile?.avatarColor || '#3b82f6'}66`,
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            {(userProfile?.displayName ? userProfile.displayName[0] : '?').toUpperCase()}
          </div>
        </button>
      </div>
    </header>
  );
}
