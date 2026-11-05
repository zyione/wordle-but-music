import React from "react";
import {
  AudioLines,
  HelpCircle,
  BarChart2,
  Calendar,
  Infinity,
  Disc,
  Trophy,
  Users,
  User,
} from "lucide-react";

export default function Header({
  gameMode,
  onToggleMode,
  onOpenHelp,
  onOpenStats,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenSpotifyModal,
  activePlaylistName,
  userProfile,
}) {
  const modes = [
    ["daily", "Daily", Calendar],
    ["unlimited", "Unlimited", Infinity],
    ["spotify", "Spotify", Disc],
    ["party", "Party", Users],
  ];
  return (
    <header className="app-header">
      <div className="logo-group">
        <AudioLines className="studio-logo" size={32} />
        <div>
          <h1 className="app-title">MIDNIGHT STUDIO</h1>
          <p className="brand-caption">SONG GUESSER</p>
        </div>
      </div>
      <nav className="nav-actions" aria-label="Your game">
        {[
          [onOpenHelp, HelpCircle, "Help"],
          [onOpenStats, BarChart2, "Stats"],
          [onOpenLeaderboard, Trophy, "Leaderboard"],
          [onOpenProfile, User, "Profile"],
        ].map(([action, Icon, label]) => (
          <button
            key={label}
            className="icon-btn"
            onClick={action}
            aria-label={label}
            title={
              label === "Profile" ? userProfile?.displayName || label : label
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <nav className="mode-tabs" aria-label="Game mode">
        {modes.map(([mode, label, Icon]) => (
          <button
            key={mode}
            onClick={() => onToggleMode(mode)}
            aria-pressed={gameMode === mode}
            className={`mode-tab ${gameMode === mode ? "selected" : ""}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      {gameMode === "spotify" && activePlaylistName && (
        <button className="playlist-switch" onClick={onOpenSpotifyModal}>
          <Disc size={14} />
          <span>{activePlaylistName}</span>
          <span>Switch playlist →</span>
        </button>
      )}
    </header>
  );
}
