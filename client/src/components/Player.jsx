import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Volume1, VolumeX, AlertCircle, FastForward } from 'lucide-react';

export default function Player({
  previewUrl,
  guessDurationsMs = [1000, 2000, 4000, 7000, 11000, 16000],
  currentIndex,
  isGameOver,
  onSelectStep
}) {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [customMaxMs, setCustomMaxMs] = useState(null);

  // Volume & Mute State (persisted in LocalStorage)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('song_guesser_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);

  // Maximum duration of the preview audio (standard 30s)
  const maxTotalMs = 30000;

  // Active max duration allowed for current guess index (or custom selected step)
  const activeMaxMs = customMaxMs || (isGameOver
    ? maxTotalMs
    : (guessDurationsMs[Math.min(currentIndex, guessDurationsMs.length - 1)] || 16000));

  // Update audio element volume whenever state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    // Reset player when snippet duration or index changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioError(false);
      setCustomMaxMs(null);
    }
  }, [currentIndex, isGameOver, previewUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime * 1000);
      if (audio.currentTime * 1000 >= activeMaxMs) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.warn('Audio stream element error');
      setAudioError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [activeMaxMs]);

  const playSnippet = (durationMs) => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    setAudioError(false);
    audio.currentTime = 0;

    audio.play().then(() => {
      setIsPlaying(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }, durationMs);
    }).catch((err) => {
      console.error('Audio play blocked or failed:', err);
      setAudioError(true);
      setIsPlaying(false);
    });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    setAudioError(false);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      playSnippet(activeMaxMs);
    }
  };

  const handleStepClick = (stepIndex, durMs) => {
    if (stepIndex > currentIndex && !isGameOver && onSelectStep) {
      onSelectStep(stepIndex);
    } else {
      setCustomMaxMs(durMs);
      playSnippet(durMs);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    localStorage.setItem('song_guesser_volume', String(newVol));
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (volume === 0) {
        setVolume(0.8);
        localStorage.setItem('song_guesser_volume', '0.8');
      }
    } else {
      setIsMuted(true);
    }
  };

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (currentTime / activeMaxMs) * 100);
  const activeThresholdPercent = Math.min(100, (activeMaxMs / maxTotalMs) * 100);

  return (
    <div className="player-container">
      <audio ref={audioRef} src={previewUrl} preload="auto" />

      {/* CLICKABLE STEP DURATION PILLS (1, 2, 3, 4, 5, 6) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, width: '100%' }}>
        {guessDurationsMs.map((durMs, stepIdx) => {
          const isStepActive = stepIdx === currentIndex && !customMaxMs;
          const isStepPassed = stepIdx < currentIndex;
          const isSelectedCustom = customMaxMs === durMs;

          let pillBg = 'rgba(255, 255, 255, 0.05)';
          let pillBorder = 'rgba(255, 255, 255, 0.1)';
          let textColor = 'var(--text-muted)';

          if (isSelectedCustom || isStepActive) {
            pillBg = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            pillBorder = '#60a5fa';
            textColor = '#ffffff';
          } else if (isStepPassed) {
            pillBg = 'rgba(16, 185, 129, 0.15)';
            pillBorder = 'rgba(16, 185, 129, 0.3)';
            textColor = '#10b981';
          }

          return (
            <button
              key={stepIdx}
              onClick={() => handleStepClick(stepIdx, durMs)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 2px',
                borderRadius: 10,
                background: pillBg,
                border: `1px solid ${pillBorder}`,
                color: textColor,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: (isStepActive || isSelectedCustom) ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none'
              }}
              title={stepIdx > currentIndex ? `Click to skip to attempt ${stepIdx + 1} (${durMs / 1000}s)` : `Play ${durMs / 1000}s snippet`}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>#{stepIdx + 1}</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{durMs / 1000}s</span>
            </button>
          );
        })}
      </div>

      {/* Progress Timeline with threshold ticks */}
      <div className="timeline-bar-wrapper">
        <div
          className="timeline-active-threshold"
          style={{ width: `${activeThresholdPercent}%` }}
        />
        <div
          className="timeline-progress"
          style={{ width: `${progressPercent}%` }}
        />

        {guessDurationsMs.map((dur, i) => {
          const tickPercent = (dur / maxTotalMs) * 100;
          return (
            <div
              key={i}
              className="tick-mark"
              style={{ left: `${tickPercent}%` }}
              title={`${dur / 1000}s`}
            />
          );
        })}
      </div>

      <div className="player-controls">
        <span className="time-display">{formatTime(currentTime)}</span>

        <button
          className="play-btn"
          onClick={togglePlay}
          disabled={!previewUrl}
          aria-label={isPlaying ? 'Pause snippet' : 'Play snippet'}
        >
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* SLEEK GLASSMORPHISM VOLUME PILL */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            padding: '4px 10px',
            gap: 6,
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
                width: 48,
                height: 4,
                cursor: 'pointer'
              }}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {isPlaying ? (
            <div className="visualizer-wave">
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
              <div className="wave-bar" />
            </div>
          ) : (
            <span className="time-display" style={{ textAlign: 'right' }}>
              {formatTime(activeMaxMs)}
            </span>
          )}
        </div>
      </div>

      {audioError && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#ef4444', fontSize: '0.8rem', marginTop: 4 }}>
          <AlertCircle size={14} />
          <span>Audio stream blocked by browser or network. Click Play to retry.</span>
        </div>
      )}
    </div>
  );
}
