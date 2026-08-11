import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import GuessGrid from './components/GuessGrid.jsx';
import Player from './components/Player.jsx';
import SearchAutocomplete from './components/SearchAutocomplete.jsx';
import ResultModal from './components/ResultModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import StatsModal from './components/StatsModal.jsx';
import SpotifyModal, { saveCachedPlaylist } from './components/SpotifyModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import LeaderboardModal from './components/LeaderboardModal.jsx';
import PartyModal from './components/PartyModal.jsx';
import PartyLobby from './components/PartyLobby.jsx';
import PartyGame from './components/PartyGame.jsx';
import AudioUnlockBanner from './components/AudioUnlockBanner.jsx';
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
  const [gameMode, setGameMode] = useState('daily'); // 'daily' | 'unlimited' | 'spotify' | 'party'
  const [spotifyPlaylist, setSpotifyPlaylist] = useState(null);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [playedSongIds, setPlayedSongIds] = useState([]);
  const [bgImportStatus, setBgImportStatus] = useState(null);

  // User profile & Modals
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  // Party mode state
  const [partyState, setPartyState] = useState(null);

  // Puzzle gameplay state
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());

  const [guesses, setGuesses] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [targetSong, setTargetSong] = useState(null);
  const [gameScore, setGameScore] = useState(0);

  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState(getLocalStats());

  const anonId = getAnonId();

  // Global Audio Context unlock listener for page refresh
  useEffect(() => {
    const unlockAudioContext = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        try {
          const ctx = new AudioContext();
          ctx.resume().catch(() => {});
        } catch {}
      }
      const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silentAudio.volume = 0;
      silentAudio.play().catch(() => {});
    };

    window.addEventListener('click', unlockAudioContext, { once: true });
    window.addEventListener('keydown', unlockAudioContext, { once: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudioContext);
      window.removeEventListener('keydown', unlockAudioContext);
      window.removeEventListener('touchstart', unlockAudioContext);
    };
  }, []);

  // Load User Profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/profile?anonId=${anonId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUserProfile(data.profile);
          } else {
            setShowProfileModal(true);
          }
        }
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }
    };
    fetchProfile();
  }, [anonId]);

  const handleSaveProfile = async ({ displayName, avatarColor }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId, displayName, avatarColor })
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  // Load puzzle based on active mode
  const fetchPuzzle = async (mode, customSpotifyIds = null, currentExcludes = playedSongIds) => {
    if (mode === 'party') return;

    try {
      setLoading(true);
      setError(null);
      setStartTime(Date.now());

      let endpoint = `/api/puzzle/today?anonId=${anonId}`;

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

        if (data.userAttempt && data.userAttempt.guesses?.length) {
          setGuesses(data.userAttempt.guesses);
          setIsGameOver(data.userAttempt.isGameOver);
          setIsSolved(data.userAttempt.isSolved);
          setTargetSong(data.userAttempt.targetSong || null);
          setGameScore(data.userAttempt.score || 0);
          setShowResult(false);
          localStorage.setItem(storageKey, JSON.stringify({
            guesses: data.userAttempt.guesses,
            isGameOver: data.userAttempt.isGameOver,
            isSolved: data.userAttempt.isSolved,
            targetSong: data.userAttempt.targetSong,
            score: data.userAttempt.score || 0
          }));
        } else if (savedState) {
          const parsed = JSON.parse(savedState);
          setGuesses(parsed.guesses || []);
          setIsGameOver(parsed.isGameOver || false);
          setIsSolved(parsed.isSolved || false);
          setTargetSong(parsed.targetSong || null);
          setGameScore(parsed.score || 0);
          setShowResult(false);
        } else {
          setGuesses([]);
          setIsGameOver(false);
          setIsSolved(false);
          setTargetSong(null);
          setGameScore(0);
          setShowResult(false);
        }
      } else {
        setGuesses([]);
        setIsGameOver(false);
        setIsSolved(false);
        setTargetSong(null);
        setGameScore(0);
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
    if (gameMode !== 'party') {
      setPlayedSongIds([]);
      fetchPuzzle(gameMode, null, []);
    }
  }, [gameMode]);

  const handleToggleMode = (newMode) => {
    if (newMode === 'party') {
      if (!partyState) {
        setShowPartyModal(true);
      } else {
        setGameMode('party');
      }
      return;
    }

    if (newMode === 'spotify') {
      setShowSpotifyModal(true);
      if (spotifyPlaylist) {
        setGameMode('spotify');
      }
      return;
    }
    setGameMode(newMode);
  };

  // Party mode actions
  const handleCreateParty = async (partyConfig) => {
    const res = await fetch(`${API_BASE_URL}/api/party/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostAnonId: anonId,
        displayName: userProfile?.displayName || 'Host',
        avatarColor: userProfile?.avatarColor || '#3b82f6',
        ...partyConfig
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create party room');
    }
    const state = await res.json();
    setPartyState(state);
    setGameMode('party');
    setShowPartyModal(false);
  };

  const handleJoinParty = async (code) => {
    const res = await fetch(`${API_BASE_URL}/api/party/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyCode: code,
        anonId,
        displayName: userProfile?.displayName || 'Player',
        avatarColor: userProfile?.avatarColor || '#ec4899'
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to join party');
    }
    const state = await res.json();
    setPartyState(state);
    setGameMode('party');
    setShowPartyModal(false);
  };

  const handleStartPartyGame = async () => {
    if (!partyState?.code) return;
    const res = await fetch(`${API_BASE_URL}/api/party/${partyState.code}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostAnonId: anonId })
    });
    if (res.ok) {
      const state = await res.json();
      setPartyState(state);
    }
  };

  const handleLeaveParty = () => {
    setPartyState(null);
    setGameMode('daily');
  };

  const handleSelectCached = (playlist) => {
    setSpotifyPlaylist(playlist);
    setGameMode('spotify');
    setPlayedSongIds([]);
    fetchPuzzle('spotify', playlist.songIds, []);
  };

  // Background stream importer
  const handleStartImport = async (playlistUrl) => {
    try {
      setBgImportStatus({
        isImporting: true,
        playlistName: 'Spotify Playlist',
        current: 0,
        total: 50,
        readyCount: 0,
        isComplete: false
      });

      const response = await fetch(`${API_BASE_URL}/api/spotify/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl })
      });

      if (!response.ok) throw new Error('Failed to import playlist');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let hasLaunchedGame = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);

            if (msg.type === 'init') {
              setBgImportStatus({
                isImporting: true,
                playlistName: msg.playlistName,
                current: 0,
                total: msg.total,
                readyCount: 0,
                isComplete: false
              });
            } else if (msg.type === 'progress' || msg.type === 'first_match') {
              setBgImportStatus({
                isImporting: true,
                playlistName: msg.playlistName,
                current: msg.current || 0,
                total: msg.total || 50,
                readyCount: msg.importedTracksCount,
                isComplete: false
              });

              if (msg.songIds && msg.songIds.length > 0) {
                const updatedPl = {
                  playlistId: msg.playlistId,
                  playlistName: msg.playlistName,
                  importedTracksCount: msg.importedTracksCount,
                  songIds: msg.songIds
                };
                setSpotifyPlaylist(updatedPl);

                if (!hasLaunchedGame) {
                  hasLaunchedGame = true;
                  setGameMode('spotify');
                  setPlayedSongIds([]);
                  fetchPuzzle('spotify', msg.songIds, []);
                }
              }
            } else if (msg.type === 'complete') {
              saveCachedPlaylist(msg);
              setSpotifyPlaylist({
                playlistId: msg.playlistId,
                playlistName: msg.playlistName,
                importedTracksCount: msg.importedTracksCount,
                songIds: msg.songIds
              });

              setBgImportStatus({
                isImporting: false,
                playlistName: msg.playlistName,
                current: msg.totalPlaylistTracks,
                total: msg.totalPlaylistTracks,
                readyCount: msg.importedTracksCount,
                isComplete: true
              });

              setTimeout(() => setBgImportStatus(null), 3500);
            }
          } catch (lineErr) {
            console.warn('Line parse error:', lineErr);
          }
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      setBgImportStatus(null);
    }
  };

  // Save game state for daily mode
  const saveDailyState = (newGuesses, gameOver, solved, song, score) => {
    if (gameMode !== 'daily' || !puzzleData?.puzzleDate) return;
    const storageKey = `song_guesser_${puzzleData.puzzleDate}`;
    localStorage.setItem(storageKey, JSON.stringify({
      guesses: newGuesses,
      isGameOver: gameOver,
      isSolved: solved,
      targetSong: song,
      score
    }));
  };

  const handleMakeGuess = async (selectedSong) => {
    if (!puzzleData || isGameOver) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      const bodyPayload = {
        puzzleId: puzzleData.puzzleId,
        anonId,
        songId: selectedSong.id,
        isSkip: false,
        mode: gameMode,
        targetSongId: puzzleData.targetSongId,
        currentGuessesCount: guesses.length,
        timeTakenMs
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
        setGameScore(data.score || 0);
        const updatedStats = saveLocalStats(data.isCorrect);
        setStats(updatedStats);
        saveDailyState(nextGuesses, true, data.isCorrect, data.targetSong, data.score || 0);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(nextGuesses, false, false, null, 0);
      }
    } catch (err) {
      console.error('Error submitting guess:', err);
    }
  };

  const handleSkip = async () => {
    if (!puzzleData || isGameOver) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      const bodyPayload = {
        puzzleId: puzzleData.puzzleId,
        anonId,
        songId: null,
        isSkip: true,
        mode: gameMode,
        targetSongId: puzzleData.targetSongId,
        currentGuessesCount: guesses.length,
        timeTakenMs
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
        setGameScore(data.score || 0);
        const updatedStats = saveLocalStats(false);
        setStats(updatedStats);
        saveDailyState(nextGuesses, true, false, data.targetSong, data.score || 0);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(nextGuesses, false, false, null, 0);
      }
    } catch (err) {
      console.error('Error submitting skip:', err);
    }
  };

  const handleSelectStep = async (targetIndex) => {
    if (!puzzleData || isGameOver || targetIndex <= guesses.length) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      const currentCount = guesses.length;
      const skipCount = targetIndex - currentCount + 1;

      const bodyPayload = {
        puzzleId: puzzleData.puzzleId,
        anonId,
        songId: null,
        isSkip: true,
        skipCount,
        mode: gameMode,
        targetSongId: puzzleData.targetSongId,
        currentGuessesCount: currentCount,
        timeTakenMs
      };

      const res = await fetch(`${API_BASE_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) return;
      const data = await res.json();

      const newGuesses = [...guesses];
      for (let i = 0; i < skipCount; i++) {
        newGuesses.push({
          guessNumber: currentCount + i + 1,
          isCorrect: false,
          isSkip: true,
          guessedSong: null
        });
      }

      setGuesses(newGuesses);

      if (data.isGameOver) {
        setIsGameOver(true);
        setIsSolved(false);
        setTargetSong(data.targetSong);
        setGameScore(data.score || 0);
        const updatedStats = saveLocalStats(false);
        setStats(updatedStats);
        saveDailyState(newGuesses, true, false, data.targetSong, data.score || 0);
        setTimeout(() => setShowResult(true), 600);
      } else {
        saveDailyState(newGuesses, false, false, null, 0);
      }
    } catch (err) {
      console.error('Error skipping to target step:', err);
    }
  };

  const handlePlayNextRandom = () => {
    setShowResult(false);
    fetchPuzzle(gameMode);
  };

  return (
    <>
      <AudioUnlockBanner onUnlocked={() => {}} />
      <Header
        gameMode={gameMode}
        onToggleMode={handleToggleMode}
        onOpenHelp={() => setShowHelp(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenPartyModal={() => setShowPartyModal(true)}
        onOpenSpotifyModal={() => setShowSpotifyModal(true)}
        activePlaylistName={spotifyPlaylist?.playlistName}
        userProfile={userProfile}
      />

      {/* RENDER PARTY MODE VIEW */}
      {gameMode === 'party' ? (
        partyState?.status === 'playing' ? (
          <PartyGame
            partyState={partyState}
            anonId={anonId}
            apiBaseUrl={API_BASE_URL}
            onStateUpdate={setPartyState}
            onLeaveParty={handleLeaveParty}
          />
        ) : (
          <PartyLobby
            partyState={partyState}
            anonId={anonId}
            apiBaseUrl={API_BASE_URL}
            onStartGame={handleStartPartyGame}
            onLeaveParty={handleLeaveParty}
            onStateUpdate={setPartyState}
          />
        )
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
          <div className="wave-bar" style={{ width: 6, height: 40, background: 'var(--accent-primary)', borderRadius: 3, animation: 'wave 1s infinite alternate' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
            {gameMode === 'spotify' ? 'Loading Spotify Song...' : gameMode === 'unlimited' ? 'Loading Random Song...' : "Loading Today's Puzzle..."}
          </p>
        </div>
      ) : error ? (
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
      ) : (
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <GuessGrid
            guesses={guesses}
            maxGuesses={puzzleData?.maxGuesses || 6}
            currentIndex={guesses.length}
            onSelectStep={handleSelectStep}
          />

          <Player
            previewUrl={puzzleData?.previewUrl}
            songId={puzzleData?.targetSongId}
            apiBaseUrl={API_BASE_URL}
            guessDurationsMs={puzzleData?.guessDurationsMs}
            currentIndex={guesses.length}
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
      )}

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
              <span>Playlist Ready ({bgImportStatus.readyCount} playable songs)</span>
            </>
          ) : (
            <>
              <Loader2 size={15} color="#1db954" style={{ animation: 'spin 1.2s linear infinite' }} />
              <span>Importing Spotify Playlist (Track {bgImportStatus.current} of {bgImportStatus.total}...)</span>
            </>
          )}
        </div>
      )}

      {/* MODALS */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
      {showProfileModal && (
        <ProfileModal
          userProfile={userProfile}
          onSaveProfile={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}
      {showLeaderboardModal && (
        <LeaderboardModal
          apiBaseUrl={API_BASE_URL}
          anonId={anonId}
          onClose={() => setShowLeaderboardModal(false)}
        />
      )}
      {showPartyModal && (
        <PartyModal
          onCreateParty={handleCreateParty}
          onJoinParty={handleJoinParty}
          onClose={() => setShowPartyModal(false)}
        />
      )}
      {showSpotifyModal && (
        <SpotifyModal
          onSelectCached={handleSelectCached}
          onStartImport={handleStartImport}
          onClose={() => setShowSpotifyModal(false)}
        />
      )}
      {showResult && (
        <ResultModal
          targetSong={targetSong}
          guesses={guesses}
          isSolved={isSolved}
          puzzleDate={puzzleData?.puzzleDate}
          gameMode={gameMode}
          gameScore={gameScore}
          apiBaseUrl={API_BASE_URL}
          onPlayNextUnlimited={handlePlayNextRandom}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  );
}
