import { useCallback, useEffect, useRef, useState } from 'react';
const clamp = value => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : .8;
const readMuted = () => { try { return localStorage.getItem('song_guesser_muted') === 'true'; } catch { return false; } };
const readVolume = () => { try { const saved = localStorage.getItem('song_guesser_volume'); return saved === null ? .8 : clamp(saved); } catch { return .8; } };
export default function useAudioPlayback({ source, limitMs = 30000, autoPlay = false, resetKey, onUnavailable }) {
  const audioRef = useRef(null), timer = useRef(null), version = useRef(0);
  const playing = useRef(false), starting = useRef(false), intent = useRef(false);
  const recovery = useRef({ retries: 0, notified: false });
  const playAction = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const [volume, setVolume] = useState(readVolume);
  const [isMuted, setIsMuted] = useState(readMuted);
  const settings = useRef({ volume, isMuted, onUnavailable }); settings.current = { volume, isMuted, onUnavailable };
  const stop = useCallback(() => {
    version.current++; starting.current = false; playing.current = false; intent.current = false;
    clearTimeout(timer.current); audioRef.current?.pause(); setIsPlaying(false); setIsBuffering(false);
  }, []);
  const recover = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || recovery.current.notified) return;
    const active = ++version.current;
    starting.current = false; playing.current = false; clearTimeout(timer.current);
    audio.pause(); setIsPlaying(false); setIsBuffering(false);
    if (globalThis.navigator?.onLine === false) { setIsRecovering(false); setAudioError('offline'); return; }
    if (recovery.current.retries < 1) {
      recovery.current.retries++;
      setAudioError(null); setIsRecovering(true);
      const url = new URL(source, window.location?.href || 'http://localhost');
      url.searchParams.set('refresh', '1'); url.searchParams.set('retry', String(Date.now()));
      audio.src = url.href; audio.load();
      return;
    }
    recovery.current.notified = true;
    setIsRecovering(true);
    Promise.resolve(settings.current.onUnavailable?.({ resume: intent.current })).then(replaced => {
      if (active === version.current && !replaced) { setIsRecovering(false); setAudioError('unavailable'); }
    }).catch(() => { if (active === version.current) { setIsRecovering(false); setAudioError('unavailable'); } });
  }, [source]);
  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !source || starting.current) return;
    intent.current = true;
    if (audio.error) { recover(); return; }
    const active = ++version.current;
    starting.current = true; setIsBuffering(true);
    try {
      if (audio.currentTime * 1000 >= limitMs) audio.currentTime = 0;
      audio.volume = settings.current.isMuted ? 0 : settings.current.volume;
      await audio.play();
      if (active !== version.current) return;
      playing.current = true; setIsPlaying(true); setIsBuffering(false); setIsRecovering(false); setAudioError(null);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { stop(); audio.currentTime = 0; setCurrentTime(0); }, Math.max(0, limitMs - audio.currentTime * 1000));
    } catch (error) {
      if (active === version.current) {
        starting.current = false;
        if (error.name === 'NotAllowedError') { intent.current = false; setIsBuffering(false); setIsRecovering(false); }
        else if (error.name !== 'AbortError') recover();
      }
    } finally { if (active === version.current) starting.current = false; }
  }, [source, limitMs, stop, recover]);
  playAction.current = play;
  const togglePlay = () => {
    if (playing.current || starting.current) stop();
    else { if (audioError) { recovery.current = { retries: 0, notified: false }; setAudioError(null); } play(); }
  };
  const invalidate = useCallback(() => { version.current++; }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    stop(); recovery.current = { retries: 0, notified: false }; audio.currentTime = 0;
    setCurrentTime(0); setAudioError(null); setIsRecovering(false);
    const update = () => { setCurrentTime(audio.currentTime * 1000); if (audio.currentTime * 1000 >= limitMs) { stop(); audio.currentTime = 0; setCurrentTime(0); } };
    const ended = () => { stop(); setCurrentTime(0); };
    const waiting = () => { if (intent.current) setIsBuffering(true); clearTimeout(timer.current); };
    const resumed = () => {
      setIsBuffering(false);
      if (intent.current) { clearTimeout(timer.current); timer.current = setTimeout(() => { stop(); audio.currentTime = 0; setCurrentTime(0); }, Math.max(0, limitMs - audio.currentTime * 1000)); }
    };
    const ready = () => { setIsRecovering(false); setAudioError(null); if (intent.current && !playing.current && !starting.current) playAction.current(); };
    const events = { timeupdate: update, ended, error: recover, waiting, playing: resumed, canplay: ready };
    for (const [name, handler] of Object.entries(events)) audio.addEventListener(name, handler);
    if (autoPlay) play();
    return () => { invalidate(); starting.current = false; playing.current = false; intent.current = false; clearTimeout(timer.current); audio.pause(); for (const [name, handler] of Object.entries(events)) audio.removeEventListener(name, handler); };
  }, [source, limitMs, resetKey, autoPlay, play, stop, invalidate, recover]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume; }, [volume, isMuted, source]);
  useEffect(() => {
    const sync = () => { setVolume(readVolume()); setIsMuted(readMuted()); };
    window.addEventListener('song-guesser-volume', sync);
    return () => window.removeEventListener('song-guesser-volume', sync);
  }, []);
  const handleVolumeChange = event => {
    const value = clamp(event.target.value); setVolume(value); setIsMuted(value === 0);
    try { localStorage.setItem('song_guesser_volume', String(value)); localStorage.setItem('song_guesser_muted', String(value === 0)); } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event('song-guesser-volume'));
  };
  const toggleMute = () => {
    if (volume === 0) { handleVolumeChange({ target: { value: .8 } }); return; }
    const muted = !isMuted; setIsMuted(muted);
    try { localStorage.setItem('song_guesser_muted', String(muted)); } catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event('song-guesser-volume'));
  };
  return { audioRef, isPlaying, isBuffering, isRecovering, currentTime, audioError, volume, isMuted, togglePlay, handleVolumeChange, toggleMute };
}
