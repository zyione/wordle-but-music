import useAudioPlayback from '../hooks/useAudioPlayback.js';
import React from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  AlertCircle,
  Lock,
  Loader2,
} from "lucide-react";

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function Player({
  previewUrl,
  guessDurationsMs = [1000, 2000, 4000, 7000, 11000, 16000],
  currentIndex,
  isGameOver,
  onSelectStep,
  songId,
  apiBaseUrl,
  disabled = false,
  onUnavailable,
  autoPlay = false,
}) {
  const activeBaseUrl = apiBaseUrl || DEFAULT_API_BASE_URL;
  // Maximum duration of the preview audio (standard 30s)
  const maxTotalMs = 30000;

  // Active max duration allowed for current guess index
  const activeMaxMs = isGameOver
    ? maxTotalMs
    : guessDurationsMs[Math.min(currentIndex, guessDurationsMs.length - 1)] ||
      16000;

  const activeAudioSrc = previewUrl
    ? previewUrl.startsWith("data:") || previewUrl.startsWith("blob:")
      ? previewUrl
      : `${activeBaseUrl}/api/audio/proxy?url=${encodeURIComponent(previewUrl)}${songId ? `&songId=${songId}` : ""}`
    : "";

  const { audioRef, isPlaying, currentTime, audioError, isBuffering, isRecovering, volume, isMuted, togglePlay, handleVolumeChange, toggleMute } = useAudioPlayback({ source: activeAudioSrc, limitMs: activeMaxMs, resetKey: currentIndex, onUnavailable, autoPlay });

  const handleTickClick = (stepIndex) => {
    if (stepIndex > currentIndex && !isGameOver && onSelectStep) {
      onSelectStep(stepIndex);
    }
  };

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, (currentTime / maxTotalMs) * 100);
  const activeThresholdPercent = Math.min(
    100,
    (activeMaxMs / maxTotalMs) * 100,
  );

  return (
    <section
      className={`player-container ${isPlaying ? "is-playing" : ""}`}
      aria-label="Snippet player"
    >
      <audio ref={audioRef} src={activeAudioSrc} preload="auto" />
      <div className="studio-waveform" aria-hidden="true">
        {Array.from({ length: 65 }, (_, i) => (
          <span
            key={i}
            style={{
              height: `${15 + Math.abs(Math.sin(i * 1.71) * Math.cos(i * 0.31)) * 85}%`,
              animationDelay: `${i * -0.07}s`,
            }}
          />
        ))}
      </div>
      <div className="listening-heading">
        <h2>
          {isGameOver
            ? "Your song, revealed"
            : `${isPlaying ? "Listening for" : "Listen for"} ${activeMaxMs / 1000} ${activeMaxMs === 1000 ? "second" : "seconds"}`}
        </h2>
        <p>
          {isGameOver
            ? "Replay the song. Find your next favorite."
            : `Guess the song · ${guessDurationsMs.length} attempts`}
        </p>
      </div>
      <div className="duration-steps" aria-label="Snippet duration">
        {guessDurationsMs.map((dur, i) => (
          <button
            type="button"
            key={dur}
            className={`duration-step ${!isGameOver && i === Math.min(currentIndex, guessDurationsMs.length - 1) ? "selected" : ""}`}
            aria-pressed={
              !isGameOver &&
              i === Math.min(currentIndex, guessDurationsMs.length - 1)
            }
            disabled={disabled || isGameOver || i <= currentIndex}
            onClick={() => handleTickClick(i)}
            title={
              !isGameOver && i > currentIndex
                ? `Unlock ${dur / 1000} seconds — uses ${i - currentIndex} ${i - currentIndex === 1 ? "attempt" : "attempts"}`
                : `${dur / 1000} seconds unlocked`
            }
          >
            {i > currentIndex && !isGameOver && <Lock size={12} />}
            <span>{dur / 1000}s</span>
          </button>
        ))}
      </div>
      <div className="player-controls">
        <button
          className="mute-btn"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX size={20} />
          ) : volume < 0.5 ? (
            <Volume1 size={20} />
          ) : (
            <Volume2 size={20} />
          )}
        </button>
        <button
          className="play-btn"
          onClick={togglePlay}
          disabled={!previewUrl}
          aria-busy={isBuffering || isRecovering}
          aria-label={isPlaying ? "Pause snippet" : "Play snippet"}
        >
          {isBuffering || isRecovering ? <Loader2 className="spin" size={26} /> : isPlaying ? (
            <Pause size={27} />
          ) : (
            <Play size={27} fill="currentColor" />
          )}
        </button>
        <div className="volume-control">
          <Volume2 size={16} aria-hidden="true" />
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>
      </div>
      <div className="playback-timeline">
        <span className="time-display">{formatTime(currentTime)}</span>
        <div className="timeline-bar-wrapper">
          <div
            className="timeline-active-threshold"
            style={{ width: `${activeThresholdPercent}%` }}
          />
          <div
            className="timeline-progress"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="time-display">{formatTime(activeMaxMs)}</span>
      </div>
      {!isGameOver && (
        <p className="duration-hint">
          Need more? Unlock a longer clip using an attempt.
        </p>
      )}
      {(isBuffering || isRecovering) && <p className="duration-hint" role="status">{isRecovering ? 'Refreshing your preview…' : 'Getting your snippet ready…'}</p>}
      {audioError && (
        <p className="audio-error" role="alert">
          <AlertCircle size={16} />
          {audioError === 'offline' ? 'You’re offline. Reconnect to keep listening.' : 'Preview recovery paused. Press Play to try again.'}
        </p>
      )}
    </section>
  );
}
