import usePlaylistImport from './hooks/usePlaylistImport.js';
import useGameRound from './hooks/useGameRound.js';
import { getSession } from './lib/api.js';
import { apiFetch as fetch } from './lib/api.js';
import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import GuessGrid from './components/GuessGrid.jsx';
import Player from './components/Player.jsx';
import SearchAutocomplete from './components/SearchAutocomplete.jsx';
import ResultModal from './components/ResultModal.jsx';
import HelpModal from './components/HelpModal.jsx';
import StatsModal from './components/StatsModal.jsx';
import SpotifyModal from './components/SpotifyModal.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import LeaderboardModal from './components/LeaderboardModal.jsx';
import PartyModal from './components/PartyModal.jsx';
import PartyLobby from './components/PartyLobby.jsx';
import PartyGame from './components/PartyGame.jsx';
import AudioUnlockBanner from './components/AudioUnlockBanner.jsx';
import { Shuffle, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export default function App() {
  const [gameMode, setGameMode] = useState('daily'); // 'daily' | 'unlimited' | 'spotify' | 'party'
  const [spotifyPlaylist, setSpotifyPlaylist] = useState(null);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);

  // User profile & Modals
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);

  // Party mode state
  const [partyState, setPartyState] = useState(null);

  const [showHelp, setShowHelp] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [anonId, setAnonId] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const game = useGameRound({ apiBaseUrl: API_BASE_URL, mode: gameMode, anonId, playlistSongIds: spotifyPlaylist?.songIds });
  const { puzzleData, guesses, isGameOver, isSolved, targetSong, gameScore, showResult, setShowResult, handleMakeGuess, handleSkip, handleSelectStep, isSubmitting, submissionError, loadPuzzle: fetchPuzzle } = game;
  const error = sessionError || game.error;
  const loading = !sessionError && game.loading;
  useEffect(() => { getSession().then(session => setAnonId(session.anonId)).catch(err => setSessionError(err.message)); }, []);

  // Load User Profile on mount with persistent account memory
  useEffect(() => {
    if (!anonId) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/profile?anonId=${anonId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUserProfile(data.profile);
            localStorage.removeItem('song_guesser_user_pin');
            return;
          }
        }

        // If no active profile found for anonId, try silent auto-login using saved account credentials
        const savedName = localStorage.getItem('song_guesser_saved_username');
        const savedPin = localStorage.getItem('song_guesser_user_pin');
        localStorage.removeItem('song_guesser_user_pin');

        if (savedName && savedPin) {
          const autoRes = await fetch(`${API_BASE_URL}/api/users/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anonId, displayName: savedName, pin: savedPin })
          });
          if (autoRes.ok) {
            const autoData = await autoRes.json();
            setUserProfile(autoData);
            setAnonId(autoData.anonId);
            return;
          }
        }

        // Players can create a profile from the header whenever they are ready.
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }
    };
    fetchProfile();
  }, [anonId]);

  const handleSaveProfile = async ({ displayName, pin, avatarColor }) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId, displayName, pin, avatarColor })
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to save profile' };
      }
      setUserProfile(data);
      // Remember account credentials locally so user never has to log in again on future visits
      localStorage.setItem('song_guesser_saved_username', displayName);
      localStorage.removeItem('song_guesser_user_pin');
      setAnonId(data.anonId);
      // Re-fetch daily puzzle to sync attempt status cross-device
      if (gameMode === 'daily') fetchPuzzle('daily');
      return { success: true, profile: data };
    } catch (err) {
      console.error('Error saving profile:', err);
      return { error: 'Server connection error. Please try again.' };
    }
  };

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
    if (gameMode === 'spotify') fetchPuzzle('spotify', playlist.songIds);
  };

  const playlistImport = usePlaylistImport((playlist, launch) => {
    setSpotifyPlaylist(playlist);
    if (launch) {
      setGameMode('spotify');
      if (gameMode === 'spotify') fetchPuzzle('spotify', playlist.songIds);
    }
  });
  const bgImportStatus = playlistImport.status;
  const handleStartImport = playlistImport.start;

  const handlePlayNextRandom = () => {
    setShowResult(false);
    fetchPuzzle(gameMode);
  };

  return (
    <>
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
        (partyState?.status === 'playing' || partyState?.status === 'finished') ? (
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
        <main className="game-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Player
            previewUrl={puzzleData?.previewUrl}
            songId={puzzleData?.targetSongId}
            apiBaseUrl={API_BASE_URL}
            guessDurationsMs={puzzleData?.guessDurationsMs}
            currentIndex={guesses.length}
            isGameOver={isGameOver}
            onSelectStep={handleSelectStep}
            disabled={isSubmitting}
          />

          {!isGameOver ? (
            <SearchAutocomplete
              onMakeGuess={handleMakeGuess}
              onSkip={handleSkip}
              disabled={isGameOver || isSubmitting}
              apiBaseUrl={API_BASE_URL}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {gameMode !== 'daily' && (
                <button
                  className="share-btn"
                  onClick={handlePlayNextRandom}
                  style={{
                    background: gameMode === 'spotify' ? 'linear-gradient(135deg, #1db954, #059669)' : 'linear-gradient(135deg, #0a84ff, #0071e3)',
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
                style={{ background: gameMode !== 'daily' ? 'rgba(255, 255, 255, 0.08)' : 'var(--accent-primary)', color: gameMode !== 'daily' ? 'var(--text-main)' : '#ffffff' }}
              >
                Show Result & Share
              </button>
            </div>
          )}
          {submissionError && <p className="audio-error" role="alert">{submissionError}</p>}
          <GuessGrid
            guesses={guesses}
            maxGuesses={puzzleData?.maxGuesses || 6}
            currentIndex={guesses.length}
            onSelectStep={handleSelectStep}
            disabled={isSubmitting}
          />
        </main>
      )}

      {playlistImport.error && <p className="audio-error" role="alert">{playlistImport.error}</p>}
      {bgImportStatus && <aside className="import-status" role="status">
        {bgImportStatus.isComplete ? <CheckCircle2 size={18} /> : <Loader2 size={18} className="spin" />}
        <div><strong>{bgImportStatus.isComplete ? 'Playlist ready' : bgImportStatus.total ? 'Importing in the background' : 'Reading your playlist…'}</strong><p>{bgImportStatus.readyCount || 0} songs ready{bgImportStatus.total ? ` · ${bgImportStatus.current} of ${bgImportStatus.total} checked` : ''}</p></div>
        {bgImportStatus.isImporting && bgImportStatus.total > 0 && <progress value={bgImportStatus.current} max={bgImportStatus.total} aria-label="Playlist import progress" />}
      </aside>}

      <AudioUnlockBanner />

      {/* MODALS */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showProfileModal && (
        <ProfileModal
          userProfile={userProfile}
          apiBaseUrl={API_BASE_URL}
          anonId={anonId}
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
