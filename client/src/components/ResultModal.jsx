import React, { useState, useEffect, useRef } from 'react';
import { X, Share2, ExternalLink, Trophy, Music, Shuffle, Play, Pause, Volume2 } from 'lucide-react';

export default function ResultModal({ targetSong, guesses, isSolved, puzzleDate, gameMode, onPlayNextUnlimited, onClose }) {
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    // Auto-play preview audio when modal opens
    if (audioRef.current && targetSong?.preview_url) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Auto-play blocked by browser policy:', err);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [targetSong?.preview_url]);

  if (!targetSong) return null;

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error('Audio play error:', err));
    }
  };

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
    const modeLabel = gameMode === 'spotify' ? 'Spotify Playlist 🎧' : gameMode === 'unlimited' ? 'Unlimited ♾️' : (puzzleDate || '');

    return `Song Guesser ${modeLabel}\n🔊 ${scoreStr}\n\n${gridString}\n\nPlay at: ${window.location.origin}`;
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
      <audio ref={audioRef} src={targetSong.preview_url} preload="auto" onEnded={() => setIsPlaying(false)} />

      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSolved ? <Trophy size={24} color="#10b981" /> : <Music size={24} color="#ef4444" />}
            <h2 className="modal-title">
              {isSolved ? 'Splendid! You guessed it!' : 'Game Over! The song was:'}
            </h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="reveal-card">
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {targetSong.artwork_url ? (
              <img src={targetSong.artwork_url} alt={targetSong.title} className="reveal-art" />
            ) : (
              <div className="reveal-art" style={{ background: '#1e293b' }} />
            )}

            {/* Audio Toggle Floating Overlay Button */}
            <button
              onClick={toggleAudio}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: isPlaying ? '#10b981' : '#3b82f6',
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

          {isPlaying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
              <Volume2 size={16} />
              <span>Playing 30s audio preview...</span>
            </div>
          )}

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
                background: gameMode === 'spotify' ? 'linear-gradient(135deg, #1db954, #059669)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
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
