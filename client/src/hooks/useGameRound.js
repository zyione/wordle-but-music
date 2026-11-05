import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api.js';
const empty = { guesses: [], isGameOver: false, isSolved: false, targetSong: null, score: 0 };

export default function useGameRound(options) {
  const latest = useRef(options);
  latest.current = options;
  const activeLoad = useRef(null);
  const generation = useRef(0);
  const mutation = useRef(null);
  const retry = useRef(null);
  const completed = useRef(new Set());
  const [state, setState] = useState({ ...empty, puzzleData: null, loading: true, error: null, submissionError: null, isSubmitting: false, showResult: false });
  const current = useRef(state);
  current.current = state;
  const loadPuzzle = useCallback(async (modeOverride, customIds) => {
    const settings = latest.current;
    const mode = modeOverride || settings.mode;
    activeLoad.current?.abort();
    const version = ++generation.current;
    mutation.current = null;
    retry.current = null;
    if (!settings.anonId || mode === 'party' && !settings.roundEndpoint) return;
    const controller = new AbortController();
    activeLoad.current = controller;
    setState(s => ({ ...s, loading: true, error: null, showResult: false, isSubmitting: false, submissionError: null }));
    try {
      let history = [];
      try { const stored = JSON.parse(sessionStorage.getItem(`song_guesser_history_${mode}`) || '[]'); if (Array.isArray(stored)) history = stored; } catch { /* Empty history if storage is unavailable. */ }
      let endpoint = settings.roundEndpoint || '/api/puzzle/today';
      if (mode === 'unlimited') endpoint = `/api/puzzle/random?excludeIds=${history.join(',')}`;
      if (mode === 'spotify') {
        const ids = customIds || settings.playlistSongIds;
        if (!ids?.length) throw new Error('Choose or import a Spotify playlist to play.');
        endpoint = `/api/puzzle/spotify?songIds=${ids.join(',')}&excludeIds=${history.join(',')}`;
      }
      const response = await apiFetch(`${settings.apiBaseUrl}${endpoint}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load game.');
      if (version !== generation.current || controller.signal.aborted) return;
      if (data.targetSongId && ['unlimited', 'spotify'].includes(mode)) {
        try { sessionStorage.setItem(`song_guesser_history_${mode}`, JSON.stringify(data.historyReset ? [data.targetSongId] : [...history, data.targetSongId])); } catch { /* Playing remains available without browser storage. */ }
      }
      setState({ ...empty, ...(data.userAttempt || {}), puzzleData: data, loading: false, error: null, submissionError: null, isSubmitting: false, showResult: false });
    } catch (error) {
      if (!controller.signal.aborted && version === generation.current) setState(s => ({ ...s, loading: false, error: error.message }));
    }
  }, []);
  useEffect(() => {
    loadPuzzle(options.mode);
    return () => { activeLoad.current?.abort(); generation.current++; };
  }, [options.mode, options.anonId, options.roundEndpoint, loadPuzzle]);

  const submit = useCallback(async (song, skips = 1) => {
    const game = current.current;
    if (!game.puzzleData || game.loading || game.isGameOver || mutation.current) return false;
    const version = generation.current;
    const identity = {};
    mutation.current = identity;
    setState(s => ({ ...s, isSubmitting: true, submissionError: null }));
    const signature = JSON.stringify([game.puzzleData.puzzleId, game.guesses.length, song?.id, skips]);
    const payload = retry.current?.signature === signature ? retry.current.payload : { requestId: crypto.randomUUID(), puzzleId: game.puzzleData.puzzleId, songId: song?.id || null, isSkip: !song, skipCount: skips, currentGuessesCount: game.guesses.length };
    retry.current = { signature, payload };
    try {
      const response = await apiFetch(`${latest.current.apiBaseUrl}/api/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save your guess. Please retry.');
      if (version !== generation.current) return false;
      retry.current = null;
      setState(s => ({ ...s, ...data, showResult: data.isGameOver && latest.current.mode !== 'party', submissionError: null }));
      if (data.isGameOver && !completed.current.has(payload.puzzleId)) {
        completed.current.add(payload.puzzleId);
        latest.current.onCompleted?.(data);
      }
      return true;
    } catch (error) {
      if (version === generation.current) setState(s => ({ ...s, submissionError: error.message }));
      return false;
    } finally {
      if (mutation.current === identity) { mutation.current = null; setState(s => ({ ...s, isSubmitting: false })); }
    }
  }, []);
  return { ...state, gameScore: state.score, loadPuzzle,
    setShowResult: value => setState(s => ({ ...s, showResult: value })),
    handleMakeGuess: song => submit(song), handleSkip: () => submit(null),
    handleSelectStep: index => index > current.current.guesses.length ? submit(null, index - current.current.guesses.length) : Promise.resolve(false),
  };
}
