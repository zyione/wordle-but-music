import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export default function Player({ previewUrl, guessDurationsMs = [1000, 2000, 4000, 7000, 11000, 16000], currentIndex, isGameOver }) {
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Maximum duration of the preview audio (standard 30s)
  const maxTotalMs = 30000;

  // Active max duration allowed for current guess index
  const activeMaxMs = isGameOver
    ? maxTotalMs
    : (guessDurationsMs[Math.min(currentIndex, guessDurationsMs.length - 1)] || 16000);

  useEffect(() => {
    // Reset player when snippet duration or index changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [activeMaxMs]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      // Always play from beginning
      if (audio.currentTime * 1000 >= activeMaxMs || audio.currentTime === 0) {
        audio.currentTime = 0;
      }
      
      audio.play().then(() => {
        setIsPlaying(true);
        const remainingMs = activeMaxMs - (audio.currentTime * 1000);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          audio.pause();
          audio.currentTime = 0;
          setIsPlaying(false);
        }, Math.max(0, remainingMs));
      }).catch((err) => {
        console.error('Audio play error:', err);
        setIsPlaying(false);
      });
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
    </div>
  );
}
