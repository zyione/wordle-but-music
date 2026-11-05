import useAudioPlayback from '../hooks/useAudioPlayback.js';
import useDialog from '../hooks/useDialog.js';
import React, { useState } from 'react';
import { X, Share2, ExternalLink, Trophy, Music, Shuffle, Play, Pause, Volume2, Volume1, VolumeX } from 'lucide-react';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export default function ResultModal({ targetSong, guesses, isSolved, puzzleDate, gameMode, gameScore = 0, onPlayNextUnlimited, onClose, apiBaseUrl }) {
  const dialogRef = useDialog(onClose);
  const [copied, setCopied] = useState(false);

  const activeBaseUrl = apiBaseUrl || DEFAULT_API_BASE_URL;
  const audioSrc = targetSong?.preview_url
    ? `${activeBaseUrl}/api/audio/proxy?url=${encodeURIComponent(targetSong.preview_url)}${targetSong.id ? `&songId=${targetSong.id}` : ''}`
    : '';

  const { audioRef, isPlaying, audioError, volume, isMuted, togglePlay: toggleAudio, handleVolumeChange, toggleMute } = useAudioPlayback({ source: audioSrc, autoPlay: true });
  if (!targetSong) return null;

  // Generate Emoji Grid
  const generateShareText = () => {
    const emojis = guesses.map((g) => {
      if (g.isCorrect) return '🟩';
      if (g.isSkip) return '🟧';
      return '🟥';
    });

    while (emojis.length < 6) {
      emojis.push('⬛');
    }

    const gridString = emojis.join('');
    const scoreStr = isSolved ? `${guesses.length}/6` : 'X/6';
    const scoreBadge = gameScore > 0 ? ` ⭐ ${gameScore.toLocaleString()} pts` : '';
    const modeLabel = gameMode === 'spotify' ? 'Spotify Playlist 🎧' : gameMode === 'unlimited' ? 'Unlimited ♾️' : (puzzleDate || '');

    return `Song Guesser ${modeLabel}\n🔊 ${scoreStr}${scoreBadge}\n\n${gridString}\n\nPlay at: ${window.location.origin}`;
  };

  const handleCopyShare = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(err => console.error('Copy failed:', err));
  };

  return (
    <div className="modal-overlay">
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Result" className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSolved ? <Trophy size={24} color="var(--accent-primary)" /> : <Music size={24} color="#ef4444" />}
            <h2 className="modal-title">
              {isSolved ? 'CORRECT!' : 'THE SONG WAS…'}
            </h2>
          </div>
          <button className="close-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reveal-card">
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {targetSong.artwork_url ? (
              <img src={targetSong.artwork_url} alt={targetSong.title} className="reveal-art" />
            ) : (
              <div className="reveal-art" style={{ background: '#2c3324' }} />
            )}

            {/* Floating Audio Play/Pause Button */}
            <button
              onClick={toggleAudio}
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                background: 'var(--accent-primary)',
                border: 'none',
                width: 44,
                height: 44,
                borderRadius: '50%',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              title={isPlaying ? 'Pause Audio' : 'Play Full Audio Preview'}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
            </button>
          </div>

          <div>
            <h3 className="reveal-song-title">{targetSong.title}</h3>
            <p className="reveal-artist-name">{targetSong.artist}</p>
            {targetSong.album && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
                Album: {targetSong.album}
              </p>
            )}
          </div>

          {/* SLEEK VOLUME CONTROL ALIGNED WITH MAIN PLAYER */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 4 }}>
            {isPlaying && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>Playing 30s preview</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 20,
              padding: '4px 12px',
              gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isMuted || volume === 0 ? '#ef4444' : '#10b981',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
                title={isMuted ? 'Unmute' : `Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={15} />
                ) : volume < 0.5 ? (
                  <Volume1 size={15} />
                ) : (
                  <Volume2 size={15} />
                )}
              </button>

              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: 54,
                  height: 4,
                  cursor: 'pointer'
                }}
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>

          {audioError && <p className="audio-error" role="status">Preview unavailable. Press play to retry.</p>}
          <div className="result-summary"><div><strong>{isSolved ? guesses.length : 'X'} / 6</strong><span>ATTEMPTS</span></div><div><strong>{gameScore.toLocaleString()}<small> pts</small></strong><span>SCORE</span></div></div>
          <div className="share-grid-box">
            {guesses.map((g, i) => (
              <span key={i}>
                {g.isCorrect ? '🟩' : g.isSkip ? '🟧' : '🟥'}
              </span>
            ))}
            {Array.from({ length: Math.max(0, 6 - guesses.length) }).map((_, i) => (
              <span key={`empty-${i}`}>⬛</span>
            ))}
          </div>

          {/* PLAY NEXT SONG BUTTON FOR UNLIMITED & SPOTIFY MODES */}
          {gameMode !== 'daily' && (
            <button
              className="share-btn"
              onClick={onPlayNextUnlimited}
              style={{
                background: gameMode === 'spotify' ? 'linear-gradient(135deg, #1db954, #059669)' : 'linear-gradient(135deg, #c5f74a, #a5d637)',
                boxShadow: gameMode === 'spotify' ? '0 4px 15px rgba(29, 185, 84, 0.3)' : '0 4px 15px rgba(236, 72, 153, 0.3)'
              }}
            >
              <Shuffle size={18} />
              Play Next Song 🔀
            </button>
          )}

          <button className="share-btn" onClick={handleCopyShare} style={{ marginTop: gameMode !== 'daily' ? 8 : 0 }}>
            <Share2 size={18} />
            {copied ? 'Copied to Clipboard!' : 'Share Your Result'}
          </button>

          {targetSong.source_track_id && (
            <a
              href={`https://www.deezer.com/track/${targetSong.source_track_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--accent-primary)',
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                textDecoration: 'none'
              }}
            >
              <span>Listen full song on Deezer</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {copied && <div className="toast-msg">Result copied to clipboard!</div>}
    </div>
  );
}
