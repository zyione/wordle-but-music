import React from 'react';
import { Check, X, FastForward } from 'lucide-react';

export default function GuessGrid({ guesses, maxGuesses = 6, currentIndex, onSelectStep }) {
  const rows = Array.from({ length: maxGuesses }, (_, idx) => {
    const guess = guesses[idx];
    const isCurrent = idx === currentIndex && !guess;
    const isFuture = idx > currentIndex && !guess;

    let rowClass = 'guess-row';
    if (isCurrent) rowClass += ' active-row';
    if (isFuture) rowClass += ' future-row';

    if (guess) {
      if (guess.isCorrect) rowClass += ' row-correct';
      else if (guess.isSkip) rowClass += ' row-skipped';
      else rowClass += ' row-wrong';
    }

    return { idx, guess, isCurrent, isFuture, rowClass };
  });

  return (
    <div className="guess-grid">
      {rows.map(({ idx, guess, isCurrent, isFuture, rowClass }) => (
        <div
          key={idx}
          className={rowClass}
          onClick={() => isFuture && onSelectStep && onSelectStep(idx)}
          style={{ cursor: isFuture ? 'pointer' : 'default' }}
        >
          <span className="guess-num">{idx + 1}</span>

          <div className="guess-content">
            {guess ? (
              guess.isSkip ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-skipped)', fontWeight: 600 }}>
                  <FastForward size={18} />
                  <span>SKIPPED</span>
                </div>
              ) : (
                <>
                  {guess.guessedSong?.artwork_url && (
                    <img
                      src={guess.guessedSong.artwork_url}
                      alt={guess.guessedSong.title}
                      className="guess-art"
                    />
                  )}
                  <div className="guess-info">
                    <span className="guess-title">{guess.guessedSong?.title || 'Unknown Song'}</span>
                    <span className="guess-artist">{guess.guessedSong?.artist || 'Unknown Artist'}</span>
                  </div>
                </>
              )
            ) : (
              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {isCurrent ? 'Current attempt...' : ''}
              </span>
            )}
          </div>

          <div className="status-badge">
            {guess && (
              guess.isCorrect ? (
                <Check size={20} color="var(--status-correct)" />
              ) : guess.isSkip ? (
                <FastForward size={18} color="var(--status-skipped)" />
              ) : (
                <X size={20} color="var(--status-wrong)" />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
