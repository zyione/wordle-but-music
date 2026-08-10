import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import GuessGrid from './components/GuessGrid.jsx';
import Player from './components/Player.jsx';
import SearchAutocomplete from './components/SearchAutocomplete.jsx';
import ResultModal from './components/ResultModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import StatsModal from './components/StatsModal.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

function getAnonId() {
  let id = localStorage.getItem('song_guesser_anon_id');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('song_guesser_anon_id', id);
  }
  return id;
}

function getLocalStats() {
  try {
    const raw = localStorage.getItem('song_guesser_stats');
    return raw ? JSON.parse(raw) : { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  } catch {
    return { played: 0, won: 0, currentStreak: 0, maxStreak: 0 };
  }
}

function saveLocalStats(isWin) {
  const current = getLocalStats();
  const played = current.played + 1;
  const won = current.won + (isWin ? 1 : 0);
  const currentStreak = isWin ? current.currentStreak + 1 : 0;
  const maxStreak = Math.max(current.maxStreak, currentStreak);

  const updated = { played, won, currentStreak, maxStreak };
  localStorage.setItem('song_guesser_stats', JSON.stringify(updated));
  return updated;
}

export default function App() {
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [guesses, setGuesses] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [targetSong, setTargetSong] = useState(null);

  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState(getLocalStats());

  const anonId = getAnonId();

  // Load today's puzzle
  useEffect(() => {
    async function loadPuzzle() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/puzzle/today`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        const data = await res.json();
        setPuzzleData(data);

        // Check local storage for today's saved state
        const storageKey = `song_guesser_${data.puzzleDate}`;
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setGuesses(parsed.guesses || []);
          setIsGameOver(parsed.isGameOver || false);
          setIsSolved(parsed.isSolved || false);
          setTargetSong(parsed.targetSong || null);
          if (parsed.isGameOver) {
            setShowResult(true);
          }
        }
      } catch (err) {
        console.error('Error loading puzzle:', err);
        setError(err.message || 'Failed to connect to game server');
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, []);

  // Save game state to localStorage
  const saveGameState = (newGuesses, gameOver, solved, song) => {
    if (!puzzleData?.puzzleDate) return;
    const storageKey = `song_guesser_${puzzleData.puzzleDate}`;
    localStorage.setItem(storageKey, JSON.stringify({
      guesses: newGuesses,
      isGameOver: gameOver,
      isSolved: solved,
      targetSong: song
    }));
  };

  const handleMakeGuess = async (selectedSong) => {
    if (!puzzleData || isGameOver) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: puzzleData.puzzleId,
          anonId,
          songId: selectedSong.id,
          isSkip: false
        })
      });

      if (!res.ok) throw new Error('Failed to submit guess');
      const data = await res.json();

      const newGuessObj = {
        guessNumber: data.guessNumber,
        isCorrect: data.isCorrect,
        isSkip: false,
        guessedSong: selectedSong
      };

      const nextGuesses = [...guesses, newGuessObj];
      setGuesses(nextGuesses);

      if (data.isGameOver) {
        setIsGameOver(true);
        setIsSolved(data.isCorrect);
        setTargetSong(data.targetSong);
        const updatedStats = saveLocalStats(data.isCorrect);
        setStats(updatedStats);
        saveGameState(nextGuesses, true, data.isCorrect, data.targetSong);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveGameState(nextGuesses, false, false, null);
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
    }
  };

  const handleSkip = async () => {
    if (!puzzleData || isGameOver) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puzzleId: puzzleData.puzzleId,
          anonId,
          songId: null,
          isSkip: true
        })
      });

      if (!res.ok) throw new Error('Failed to skip');
      const data = await res.json();

      const newGuessObj = {
        guessNumber: data.guessNumber,
        isCorrect: false,
        isSkip: true,
        guessedSong: null
      };

      const nextGuesses = [...guesses, newGuessObj];
      setGuesses(nextGuesses);

      if (data.isGameOver) {
        setIsGameOver(true);
        setIsSolved(false);
        setTargetSong(data.targetSong);
        const updatedStats = saveLocalStats(false);
        setStats(updatedStats);
        saveGameState(nextGuesses, true, false, data.targetSong);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveGameState(nextGuesses, false, false, null);
      }
    } catch (err) {
      console.error('Error submitting skip:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
        <div className="wave-bar" style={{ width: 6, height: 40, background: 'var(--accent-primary)', borderRadius: 3, animation: 'wave 1s infinite alternate' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Loading Today's Song Guesser...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
        <h2>Unable to load game</h2>
        <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{error}</p>
        <button
          className="btn-submit"
          style={{ width: 'auto', marginTop: 16, padding: '0 24px' }}
          onClick={() => window.location.reload()}
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentIndex = guesses.length;

  return (
    <>
      <Header
        onOpenHelp={() => setShowHelp(true)}
        onOpenStats={() => setShowStats(true)}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <GuessGrid
          guesses={guesses}
          maxGuesses={puzzleData?.maxGuesses || 6}
          currentIndex={currentIndex}
        />

        <Player
          previewUrl={puzzleData?.previewUrl}
          guessDurationsMs={puzzleData?.guessDurationsMs}
          currentIndex={currentIndex}
          isGameOver={isGameOver}
        />

        {!isGameOver ? (
          <SearchAutocomplete
            onMakeGuess={handleMakeGuess}
            onSkip={handleSkip}
            disabled={isGameOver}
            apiBaseUrl={API_BASE_URL}
          />
        ) : (
          <button
            className="share-btn"
            onClick={() => setShowResult(true)}
            style={{ marginTop: 8 }}
          >
            Show Today's Result & Share
          </button>
        )}
      </main>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      {showResult && (
        <ResultModal
          targetSong={targetSong}
          guesses={guesses}
          isSolved={isSolved}
          puzzleDate={puzzleData?.puzzleDate}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}
