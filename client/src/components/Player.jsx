import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  AlertCircle,
  Lock,
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
}) {
  const activeBaseUrl = apiBaseUrl || DEFAULT_API_BASE_URL;
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);

  // Volume & Mute State (persisted in LocalStorage)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("song_guesser_volume");
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);

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

  // Update audio element volume whenever state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    // Reset player when snippet duration, index, or previewUrl changes
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioError(false);
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

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [activeMaxMs]);

  const attemptPlay = async (audio, durationMs) => {
    try {
      // A failed media resource must be reloaded before play() can succeed.
      if (audio.error || audioError) {
        audio.src = `${activeAudioSrc}${activeAudioSrc.includes('?') ? '&' : '?'}refresh=1&retry=${Date.now()}`;
        audio.load();
      }
      await audio.play();
      setIsPlaying(true);
      setAudioError(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }, Math.max(0, durationMs - audio.currentTime * 1000));
    } catch (err) {
      console.warn('Audio playback failed:', err.name);
      setIsPlaying(false);
      setAudioError(true);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    } else {
      audio.volume = isMuted ? 0 : volume;
      if (audio.currentTime * 1000 >= activeMaxMs || audio.currentTime === 0) {
        audio.currentTime = 0;
      }
      attemptPlay(audio, activeMaxMs);
    }
  };

  const handleTickClick = (stepIndex) => {
    if (stepIndex > currentIndex && !isGameOver && onSelectStep) {
      onSelectStep(stepIndex);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    localStorage.setItem("song_guesser_volume", String(newVol));
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (volume === 0) {
        setVolume(0.8);
        localStorage.setItem("song_guesser_volume", "0.8");
      }
    } else {
      setIsMuted(true);
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
            ? "THE FULL REVEAL"
            : `${isPlaying ? "LISTENING" : "LISTEN FOR"} ${activeMaxMs / 1000} ${activeMaxMs === 1000 ? "SECOND" : "SECONDS"}`}
        </h2>
        <p>
          {isGameOver
            ? "Replay the song. Find your next favorite."
            : `GUESS THE SONG · ${guessDurationsMs.length} ATTEMPTS`}
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
            disabled={isGameOver || i <= currentIndex}
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
          aria-label={isPlaying ? "Pause snippet" : "Play snippet"}
        >
          {isPlaying ? (
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
      {audioError && (
        <p className="audio-error" role="alert">
          <AlertCircle size={16} />
          Unable to play audio. Press play to retry.
        </p>
      )}
    </section>
  );
}
