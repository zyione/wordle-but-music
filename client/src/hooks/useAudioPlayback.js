import { useCallback, useEffect, useRef, useState } from 'react';
const clamp = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : .8;
const readVolume = () => { try { const saved = localStorage.getItem('song_guesser_volume'); return saved === null ? .8 : clamp(saved); } catch { return .8; } };
export default function useAudioPlayback({ source, limitMs = 30000, autoPlay = false, resetKey }) {
  const audioRef = useRef(null);
  const timer = useRef(null);
  const version = useRef(0);
  const playing = useRef(false);
  const starting = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [volume, setVolume] = useState(readVolume);
  const [isMuted, setIsMuted] = useState(false);
  const stop = useCallback(() => {
    version.current++; starting.current = false; playing.current = false;
    clearTimeout(timer.current); audioRef.current?.pause(); setIsPlaying(false);
  }, []);
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !source || starting.current) return;
    const active = ++version.current;
    starting.current = true;
    try {
      if (audio.error) { audio.src = `${source}${source.includes('?') ? '&' : '?'}refresh=1&retry=${Date.now()}`; audio.load(); }
      if (audio.currentTime * 1000 >= limitMs) audio.currentTime = 0;
      await audio.play();
      if (active !== version.current) return;
      playing.current = true; setIsPlaying(true); setAudioError(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { stop(); audio.currentTime = 0; setCurrentTime(0); }, Math.max(0, limitMs - audio.currentTime * 1000));
    } catch (error) { if (active === version.current) { playing.current = false; setIsPlaying(false); setAudioError(error.name !== 'NotAllowedError'); } }
    finally { if (active === version.current) starting.current = false; }
  }, [source, limitMs, stop]);
  const togglePlay = () => { if (playing.current || starting.current) stop(); else play(); };
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    stop(); audio.currentTime = 0; setCurrentTime(0); setAudioError(false);
    const update = () => { setCurrentTime(audio.currentTime * 1000); if (audio.currentTime * 1000 >= limitMs) { stop(); audio.currentTime = 0; setCurrentTime(0); } };
    const ended = () => { stop(); setCurrentTime(0); };
    const failed = () => { stop(); setAudioError(true); };
    audio.addEventListener('timeupdate', update); audio.addEventListener('ended', ended); audio.addEventListener('error', failed);
    if (autoPlay) play();
    return () => { version.current++; starting.current = false; playing.current = false; clearTimeout(timer.current); audio.pause(); audio.removeEventListener('timeupdate', update); audio.removeEventListener('ended', ended); audio.removeEventListener('error', failed); };
  }, [source, limitMs, resetKey, autoPlay, play, stop]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted, source]);
  useEffect(() => {
    const sync = () => setVolume(readVolume());
    window.addEventListener('song-guesser-volume', sync);
    return () => window.removeEventListener('song-guesser-volume', sync);
  }, []);
  const handleVolumeChange = event => {
    const value = clamp(event.target.value); setVolume(value); setIsMuted(value === 0);
    try { localStorage.setItem('song_guesser_volume', String(value)); } catch { /* Playback works without storage. */ }
    window.dispatchEvent(new Event('song-guesser-volume'));
  };
  const toggleMute = () => { setIsMuted(muted => !muted); if (volume === 0) handleVolumeChange({ target: { value: .8 } }); };
  return { audioRef, isPlaying, currentTime, audioError, volume, isMuted, togglePlay, handleVolumeChange, toggleMute };
}
