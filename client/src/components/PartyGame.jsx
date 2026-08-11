import React, { useState, useEffect } from 'react';
import GuessGrid from './GuessGrid.jsx';
import Player from './Player.jsx';
import SearchAutocomplete from './SearchAutocomplete.jsx';
import PartyStandings from './PartyStandings.jsx';
import { Loader2, Trophy, ArrowRight, Play, RefreshCw } from 'lucide-react';

export default function PartyGame({ partyState, anonId, apiBaseUrl, onStateUpdate, onLeaveParty }) {
  const [currentRound, setCurrentRound] = useState(1);
  const [roundData, setRoundData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [guesses, setGuesses] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [targetSong, setTargetSong] = useState(null);
  const [roundScore, setRoundScore] = useState(0);
  const [roundTimeMs, setRoundTimeMs] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [hasSubmittedRound, setHasSubmittedRound] = useState(false);

  const totalRounds = partyState?.numRounds || 5;

  // Load current round song data
  useEffect(() => {
    const fetchRound = async () => {
      try {
        setLoading(true);
        setError(null);
        setGuesses([]);
        setIsGameOver(false);
        setIsSolved(false);
        setTargetSong(null);
        setRoundScore(0);
        setHasSubmittedRound(false);
        setStartTime(Date.now());

        const res = await fetch(`${API_BASE_URL_SANITIZED}/api/party/${partyState.code}/round/${currentRound}`);
        if (!res.ok) {
          throw new Error('Failed to load round audio');
        }

        const data = await res.json();
        setRoundData(data);
      } catch (err) {
        console.error('Error fetching party round:', err);
        setError(err.message || 'Failed to load round');
      } finally {
        setLoading(false);
      }
    };

    if (partyState?.code) {
      fetchRound();
    }
  }, [currentRound, partyState?.code]);

  const API_BASE_URL_SANITIZED = apiBaseUrl;

  const handleMakeGuess = async (selectedSong) => {
    if (!roundData || isGameOver) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      setRoundTimeMs(timeTakenMs);

      const bodyPayload = {
        puzzleId: `party_${partyState.code}_r${currentRound}`,
        anonId,
        songId: selectedSong.id,
        isSkip: false,
        mode: 'unlimited',
        targetSongId: roundData.targetSongId,
        currentGuessesCount: guesses.length
      };

      const res = await fetch(`${API_BASE_URL_SANITIZED}/api/guess`, {
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
        submitRound(data.isCorrect, nextGuesses.length, timeTakenMs, 0, 0);
      }
    } catch (err) {
      console.error('Party guess error:', err);
    }
  };

  const handleSkip = async () => {
    if (!roundData || isGameOver) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      setRoundTimeMs(timeTakenMs);

      const bodyPayload = {
        puzzleId: `party_${partyState.code}_r${currentRound}`,
        anonId,
        songId: null,
        isSkip: true,
        mode: 'unlimited',
        targetSongId: roundData.targetSongId,
        currentGuessesCount: guesses.length
      };

      const res = await fetch(`${API_BASE_URL_SANITIZED}/api/guess`, {
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
        submitRound(false, nextGuesses.length, timeTakenMs, 1, 0);
      }
    } catch (err) {
      console.error('Party skip error:', err);
    }
  };

  const handleSelectStep = async (targetIndex) => {
    if (!roundData || isGameOver || targetIndex <= guesses.length) return;

    try {
      const timeTakenMs = Date.now() - startTime;
      const currentCount = guesses.length;
      const skipCount = targetIndex - currentCount + 1;

      const bodyPayload = {
        puzzleId: `party_${partyState.code}_r${currentRound}`,
        anonId,
        songId: null,
        isSkip: true,
        skipCount,
        mode: 'unlimited',
        targetSongId: roundData.targetSongId,
        currentGuessesCount: currentCount
      };

      const res = await fetch(`${API_BASE_URL_SANITIZED}/api/guess`, {
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
        submitRound(false, newGuesses.length, timeTakenMs, skipCount, 0);
      }
    } catch (err) {
      console.error('Party step skip error:', err);
    }
  };

  const submitRound = async (solved, guessesCount, timeTakenMs, skips, wrong) => {
    if (hasSubmittedRound) return;
    setHasSubmittedRound(true);

    try {
      const res = await fetch(`${API_BASE_URL_SANITIZED}/api/party/${partyState.code}/round/${currentRound}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anonId,
          isSolved: solved,
          guessesUsed: guessesCount,
          timeTakenMs,
          skipsUsed: skips,
          wrongGuesses: wrong
        })
      });

      if (res.ok) {
        const updatedState = await res.json();
        onStateUpdate(updatedState);

        const myStanding = updatedState.standings?.find(s => s.anonId === anonId);
        const myRoundScore = myStanding?.roundScores?.[currentRound]?.score || 0;
        setRoundScore(myRoundScore);
      }
    } catch (err) {
      console.error('Error submitting party round score:', err);
    }
  };

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound(prev => prev + 1);
    }
  };

  // If party is finished or all rounds completed
  if (partyState?.status === 'finished' || (isGameOver && currentRound >= totalRounds && hasSubmittedRound)) {
    return (
      <PartyStandings
        partyState={partyState}
        anonId={anonId}
        onLeaveParty={onLeaveParty}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#ec4899' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
          Loading Round {currentRound} of {totalRounds}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
        <h2>Round error</h2>
        <p>{error}</p>
        <button className="btn-submit" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const currentIndex = guesses.length;

  return (
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', width: '100%' }}>
      {/* Party Round Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(236, 72, 153, 0.12)',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        borderRadius: 14,
        padding: '8px 16px',
        margin: '12px 16px 0 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={18} color="#ec4899" />
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
            Round {currentRound} of {totalRounds}
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#ec4899', fontWeight: 700 }}>
          Code: {partyState?.code}
        </span>
      </div>

      <GuessGrid
        guesses={guesses}
        maxGuesses={roundData?.maxGuesses || 6}
        currentIndex={currentIndex}
        onSelectStep={handleSelectStep}
      />

      <Player
        previewUrl={roundData?.previewUrl}
        songId={roundData?.targetSongId}
        apiBaseUrl={apiBaseUrl}
        guessDurationsMs={roundData?.guessDurationsMs}
        currentIndex={currentIndex}
        isGameOver={isGameOver}
        onSelectStep={handleSelectStep}
      />

      {!isGameOver ? (
        <SearchAutocomplete
          onMakeGuess={handleMakeGuess}
          onSkip={handleSkip}
          disabled={isGameOver}
          apiBaseUrl={apiBaseUrl}
        />
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {/* Round Summary Card */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 16,
            padding: 16,
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              {isSolved ? '🎉 Round Solved!' : '❌ Round Missed'}
            </h3>
            {targetSong && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Song: <strong style={{ color: '#fff' }}>{targetSong.title}</strong> by {targetSong.artist}
              </p>
            )}
            <div style={{ marginTop: 8, fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>
              +{roundScore.toLocaleString()} pts scored
            </div>
          </div>

          {currentRound < totalRounds && (
            <button
              className="btn-submit"
              onClick={handleNextRound}
              style={{
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                padding: '14px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 8px 25px rgba(236, 72, 153, 0.4)'
              }}
            >
              <span>Next Round ({currentRound + 1} / {totalRounds})</span>
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      )}
    </main>
  );
}
