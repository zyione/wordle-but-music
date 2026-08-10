import React, { useState } from 'react';
import { X, Share2, ExternalLink, Trophy, Music } from 'lucide-react';

export default function ResultModal({ targetSong, guesses, isSolved, puzzleDate, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!targetSong) return null;

  // Generate Emoji Grid
  const generateShareText = () => {
    const emojis = guesses.map((g) => {
      if (g.isCorrect) return '🟩';
      if (g.isSkip) return '🟧';
      return '🟥';
    });

    // Fill remaining up to 6 if needed
    while (emojis.length < 6) {
      emojis.push('⬛');
    }

    const gridString = emojis.join('');
    const scoreStr = isSolved ? `${guesses.length}/6` : 'X/6';

    return `Song Guesser ${puzzleDate || ''}\n🔊 ${scoreStr}\n\n${gridString}\n\nPlay at: ${window.location.origin}`;
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
          {targetSong.artwork_url ? (
            <img src={targetSong.artwork_url} alt={targetSong.title} className="reveal-art" />
          ) : (
            <div className="reveal-art" style={{ background: '#1e293b' }} />
          )}

          <div>
            <h3 className="reveal-song-title">{targetSong.title}</h3>
            <p className="reveal-artist-name">{targetSong.artist}</p>
            {targetSong.album && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: 4 }}>
                Album: {targetSong.album}
              </p>
            )}
          </div>

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

          <button className="share-btn" onClick={handleCopyShare}>
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
