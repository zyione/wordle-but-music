import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import GuessGrid from './components/GuessGrid.jsx';
import Player from './components/Player.jsx';
import SearchAutocomplete from './components/SearchAutocomplete.jsx';
import ResultModal from './components/ResultModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import StatsModal from './components/StatsModal.jsx';
import SpotifyModal, { saveCachedPlaylist } from './components/SpotifyModal.jsx';
import { Shuffle, Loader2, CheckCircle2 } from 'lucide-react';

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
  const [gameMode, setGameMode] = useState('daily'); // 'daily' | 'unlimited' | 'spotify'
  const [spotifyPlaylist, setSpotifyPlaylist] = useState(null); // { playlistName, songIds: [...] }
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [playedSongIds, setPlayedSongIds] = useState([]); // Track played songs in session to prevent repeats
  const [bgImportStatus, setBgImportStatus] = useState(null); // { isImporting, playlistName, current, total, readyCount, isComplete }

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

  // Load puzzle based on active mode
  const fetchPuzzle = async (mode, customSpotifyIds = null, currentExcludes = playedSongIds) => {
    try {
      setLoading(true);
      setError(null);

      let endpoint = '/api/puzzle/today';

      if (mode === 'unlimited') {
        const excludeParam = currentExcludes.length > 0 ? `?excludeIds=${currentExcludes.join(',')}` : '';
        endpoint = `/api/puzzle/random${excludeParam}`;
      } else if (mode === 'spotify') {
        const songIds = customSpotifyIds || spotifyPlaylist?.songIds;
        if (!songIds || !songIds.length) {
          setShowSpotifyModal(true);
          setLoading(false);
          return;
        }
        const excludeParam = currentExcludes.length > 0 ? `&excludeIds=${currentExcludes.join(',')}` : '';
        endpoint = `/api/puzzle/spotify?songIds=${songIds.join(',')}${excludeParam}`;
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setPuzzleData(data);

      if (data.targetSongId) {
        if (data.historyReset) {
          setPlayedSongIds([data.targetSongId]);
        } else {
          setPlayedSongIds((prev) => [...prev, data.targetSongId]);
        }
      }

      if (mode === 'daily') {
        const storageKey = `song_guesser_${data.puzzleDate}`;
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setGuesses(parsed.guesses || []);
          setIsGameOver(parsed.isGameOver || false);
          setIsSolved(parsed.isSolved || false);
          setTargetSong(parsed.targetSong || null);
          if (parsed.isGameOver) setShowResult(true);
        } else {
          setGuesses([]);
          setIsGameOver(false);
          setIsSolved(false);
          setTargetSong(null);
          setShowResult(false);
        }
      } else {
        setGuesses([]);
        setIsGameOver(false);
        setIsSolved(false);
        setTargetSong(null);
        setShowResult(false);
      }
    } catch (err) {
      console.error(`Error loading ${mode} puzzle:`, err);
      setError(err.message || 'Failed to connect to game server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlayedSongIds([]);
    fetchPuzzle(gameMode, null, []);
  }, [gameMode]);

  const handleToggleMode = (newMode) => {
    if (newMode === 'spotify') {
      setShowSpotifyModal(true);
      if (spotifyPlaylist) {
        setGameMode('spotify');
      }
      return;
    }
    setGameMode(newMode);
  };

  const handleSpotifyImportSuccess = (importedData) => {
    setSpotifyPlaylist(importedData);
    setGameMode('spotify');
    setPlayedSongIds([]);
    fetchPuzzle('spotify', importedData.songIds, []);
  };

  const handleBackgroundProgress = (msg) => {
    if (msg.type === 'progress') {
      setBgImportStatus({
        isImporting: true,
        playlistName: msg.playlistName,
        current: msg.current,
        total: msg.total,
        readyCount: msg.importedTracksCount,
        isComplete: false
      });

      // Update active playlist song IDs live in background
      if (msg.songIds && msg.songIds.length > 0) {
        setSpotifyPlaylist((prev) => ({
          playlistId: msg.playlistId,
          playlistName: msg.playlistName,
          importedTracksCount: msg.importedTracksCount,
          songIds: msg.songIds
        }));
      }
    } else if (msg.type === 'complete') {
      setBgImportStatus({
        isImporting: false,
        playlistName: msg.playlistName,
        current: msg.totalPlaylistTracks,
        total: msg.totalPlaylistTracks,
        readyCount: msg.importedTracksCount,
        isComplete: true
      });

      setSpotifyPlaylist({
        playlistId: msg.playlistId,
        playlistName: msg.playlistName,
        importedTracksCount: msg.importedTracksCount,
        songIds: msg.songIds
      });

      saveCachedPlaylist(msg);

      // Hide status badge after 3.5 seconds
      setTimeout(() => {
        setBgImportStatus(null);
      }, 3500);
    }
  };

  // Save game state for daily mode
  const saveDailyState = (newGuesses, gameOver, solved, song) => {
    if (gameMode !== 'daily' || !puzzleData?.puzzleDate) return;
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
      const bodyPayload = {
        puzzleId: puzzleData.puzzleId,
        anonId,
        songId: selectedSong.id,
        isSkip: false,
        mode: gameMode,
        targetSongId: puzzleData.targetSongId,
        currentGuessesCount: guesses.length
      };

      const res = await fetch(`${API_BASE_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
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
        saveDailyState(nextGuesses, true, data.isCorrect, data.targetSong);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(nextGuesses, false, false, null);
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
    }
  };

  const handleSkip = async () => {
    if (!puzzleData || isGameOver) return;

    try {
      const bodyPayload = {
        puzzleId: puzzleData.puzzleId,
        anonId,
        songId: null,
        isSkip: true,
        mode: gameMode,
        targetSongId: puzzleData.targetSongId,
        currentGuessesCount: guesses.length
      };

      const res = await fetch(`${API_BASE_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
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
        saveDailyState(nextGuesses, true, false, data.targetSong);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(nextGuesses, false, false, null);
      }
    } catch (err) {
      console.error('Error submitting skip:', err);
    }
  };

  const handlePlayNextRandom = () => {
    setShowResult(false);
    fetchPuzzle(gameMode);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
        <div className="wave-bar" style={{ width: 6, height: 40, background: 'var(--accent-primary)', borderRadius: 3, animation: 'wave 1s infinite alternate' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          {gameMode === 'spotify' ? 'Loading Spotify Song...' : gameMode === 'unlimited' ? 'Loading Random Song...' : "Loading Today's Puzzle..."}
        </p>
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

  const handleSelectStep = async (targetIndex) => {
    if (!puzzleData || isGameOver || targetIndex <= guesses.length) return;

    try {
      let currentCount = guesses.length;
      let newGuesses = [...guesses];
      let finalData = null;

      while (currentCount <= targetIndex && currentCount < (puzzleData.maxGuesses || 6)) {
        const bodyPayload = {
          puzzleId: puzzleData.puzzleId,
          anonId,
          songId: null,
          isSkip: true,
          mode: gameMode,
          targetSongId: puzzleData.targetSongId,
          currentGuessesCount: currentCount
        };

        const res = await fetch(`${API_BASE_URL}/api/guess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) break;
        const data = await res.json();
        finalData = data;

        newGuesses.push({
          guessNumber: data.guessNumber,
          isCorrect: false,
          isSkip: true,
          guessedSong: null
        });

        currentCount++;
        if (data.isGameOver) break;
      }

      setGuesses(newGuesses);

      if (finalData?.isGameOver) {
        setIsGameOver(true);
        setIsSolved(false);
        setTargetSong(finalData.targetSong);
        const updatedStats = saveLocalStats(false);
        setStats(updatedStats);
        saveDailyState(newGuesses, true, false, finalData.targetSong);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(newGuesses, false, false, null);
      }
    } catch (err) {
      console.error('Error skipping to target step:', err);
    }
  };

  const currentIndex = guesses.length;

  return (
    <>
      <Header
        gameMode={gameMode}
        onToggleMode={handleToggleMode}
        onOpenHelp={() => setShowHelp(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenSpotifyModal={() => setShowSpotifyModal(true)}
        activePlaylistName={spotifyPlaylist?.playlistName}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <GuessGrid
          guesses={guesses}
          maxGuesses={puzzleData?.maxGuesses || 6}
          currentIndex={currentIndex}
          onSelectStep={handleSelectStep}
        />

        <Player
          previewUrl={puzzleData?.previewUrl}
          guessDurationsMs={puzzleData?.guessDurationsMs}
          currentIndex={currentIndex}
          isGameOver={isGameOver}
          onSelectStep={handleSelectStep}
        />

        {!isGameOver ? (
          <SearchAutocomplete
            onMakeGuess={handleMakeGuess}
            onSkip={handleSkip}
            disabled={isGameOver}
            apiBaseUrl={API_BASE_URL}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {gameMode !== 'daily' && (
              <button
                className="share-btn"
                onClick={handlePlayNextRandom}
                style={{
                  background: gameMode === 'spotify' ? 'linear-gradient(135deg, #1db954, #059669)' : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  boxShadow: '0 4px 15px rgba(29, 185, 84, 0.3)'
                }}
              >
                <Shuffle size={18} />
                Play Next Song 🔀
              </button>
            )}
            <button
              className="share-btn"
              onClick={() => setShowResult(true)}
              style={{ background: gameMode !== 'daily' ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #10b981, #059669)' }}
            >
              Show Result & Share
            </button>
          </div>
        )}
      </main>

      {/* NON-INTRUSIVE BACKGROUND IMPORT STATUS BADGE */}
      {bgImportStatus && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: bgImportStatus.isComplete ? 'rgba(16, 185, 129, 0.95)' : 'rgba(18, 24, 38, 0.92)',
          border: '1px solid rgba(29, 185, 84, 0.4)',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          zIndex: 1500,
          animation: 'toastFade 0.25s ease-out'
        }}>
          {bgImportStatus.isComplete ? (
            <>
              <CheckCircle2 size={16} color="#fff" />
              <span>Playlist Ready ({bgImportStatus.readyCount} songs available)</span>
            </>
          ) : (
            <>
              <Loader2 size={15} color="#1db954" style={{ animation: 'spin 1.2s linear infinite' }} />
              <span>Importing Spotify Playlist ({bgImportStatus.readyCount} / {bgImportStatus.total} ready...)</span>
            </>
          )}
        </div>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      {showSpotifyModal && (
        <SpotifyModal
          onImportSuccess={handleSpotifyImportSuccess}
          onBackgroundProgress={handleBackgroundProgress}
          onClose={() => setShowSpotifyModal(false)}
          apiBaseUrl={API_BASE_URL}
        />
      )}
      {showResult && (
        <ResultModal
          targetSong={targetSong}
          guesses={guesses}
          isSolved={isSolved}
          puzzleDate={puzzleData?.puzzleDate}
          gameMode={gameMode}
          onPlayNextUnlimited={handlePlayNextRandom}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}
