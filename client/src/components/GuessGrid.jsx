import React from "react";
import { Check, X, FastForward } from "lucide-react";

export default function GuessGrid({
  guesses,
  maxGuesses = 6,
  currentIndex,
  onSelectStep,
  disabled = false,
}) {
  const finished =
    guesses.some((g) => g.isCorrect) || guesses.length >= maxGuesses;
  return (
    <section className="attempts-section" aria-label="Attempt history">
      <div className="attempts-heading">
        <h2>ATTEMPTS</h2>
        <span>
          {guesses.length} / {maxGuesses}
        </span>
      </div>
      <div className="attempt-slots">
        {Array.from({ length: maxGuesses }, (_, i) => {
          const g = guesses[i];
          const future = i > currentIndex && !finished;
          const label = g
            ? g.isCorrect
              ? "Correct"
              : g.isSkip
                ? "Skipped"
                : "Incorrect"
            : i === currentIndex && !finished
              ? "Current attempt"
              : "Unused";
          return (
            <button
              type="button"
              key={i}
              className={`attempt-slot ${g ? (g.isCorrect ? "correct" : g.isSkip ? "skipped" : "wrong") : i === currentIndex && !finished ? "current" : ""}`}
              onClick={() => future && onSelectStep?.(i)}
              disabled={disabled || !future}
              title={
                future
                  ? `Go to attempt ${i + 1} — uses ${i - currentIndex} ${i - currentIndex === 1 ? "attempt" : "attempts"}`
                  : `${i + 1}: ${label}`
              }
              aria-label={`Attempt ${i + 1}: ${label}${future ? `; unlock using ${i - currentIndex} ${i - currentIndex === 1 ? "attempt" : "attempts"}` : ""}`}
            >
              <span>{i + 1}</span>
              {g &&
                (g.isCorrect ? (
                  <Check size={14} />
                ) : g.isSkip ? (
                  <FastForward size={12} />
                ) : (
                  <X size={14} />
                ))}
            </button>
          );
        })}
      </div>
      {guesses.length > 0 && (
        <ol className="guess-grid">
          {guesses.map((g, i) => (
            <li
              key={i}
              className={`guess-row ${g.isCorrect ? "row-correct" : g.isSkip ? "row-skipped" : "row-wrong"}`}
            >
              <span className="guess-num">{i + 1}</span>
              {g.guessedSong?.artwork_url && (
                <img
                  src={g.guessedSong.artwork_url}
                  alt=""
                  className="guess-art"
                />
              )}
              <div className="guess-content">
                <div className="guess-info">
                  <span className="guess-title">
                    {g.isSkip
                      ? "Skipped — longer clip unlocked"
                      : g.guessedSong?.title || "Unknown song"}
                  </span>
                  {!g.isSkip && (
                    <span className="guess-artist">
                      {g.guessedSong?.artist}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="status-badge"
                aria-label={
                  g.isCorrect ? "Correct" : g.isSkip ? "Skipped" : "Incorrect"
                }
              >
                {g.isCorrect ? (
                  <Check size={18} />
                ) : g.isSkip ? (
                  <FastForward size={16} />
                ) : (
                  <X size={18} />
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
