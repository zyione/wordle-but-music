import useGameRound from '../hooks/useGameRound.js';
import { apiFetch as fetch } from '../lib/api.js';
import React, { useState } from 'react';
import GuessGrid from './GuessGrid.jsx';
import Player from './Player.jsx';
import SearchAutocomplete from './SearchAutocomplete.jsx';
import PartyStandings from './PartyStandings.jsx';
import { Loader2, Trophy, ArrowRight, Play, RefreshCw } from 'lucide-react';

export default function PartyGame({ partyState, anonId, apiBaseUrl, onStateUpdate, onLeaveParty }) {
  const [currentRound, setCurrentRound] = useState(1);
  const [showFinalStandings, setShowFinalStandings] = useState(false);
  const totalRounds = partyState?.numRounds || 5;
  const game = useGameRound({ apiBaseUrl, anonId, mode: 'party', roundEndpoint: `/api/party/${partyState.code}/round/${currentRound}`, onCompleted: async () => {
    try { const response = await fetch(`${apiBaseUrl}/api/party/${partyState.code}`); if (response.ok) onStateUpdate(await response.json()); } catch (error) { console.warn('Unable to refresh standings:', error.message); }
  } });
  const { puzzleData: roundData, loading, error, guesses, isGameOver, isSolved, targetSong, gameScore: roundScore, handleMakeGuess, handleSkip, handleSelectStep, isSubmitting, submissionError } = game;

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound(prev => prev + 1);
    }
  };

  // If user requested to view final party standings
  if (showFinalStandings) {
    return (
      <PartyStandings
        partyState={partyState}
        anonId={anonId}
        apiBaseUrl={apiBaseUrl}
        onStateUpdate={onStateUpdate}
        onLeaveParty={onLeaveParty}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Loader2 size={32} style={{ animation: 'spin 1.2s linear infinite', color: '#c5f74a' }} />
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
    <main className="game-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto', width: '100%' }}>
      {/* Party Round Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(197, 247, 74, 0.12)',
        border: '1px solid rgba(197, 247, 74, 0.3)',
        borderRadius: 14,
        padding: '8px 16px',
        margin: '12px 16px 0 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={18} color="#c5f74a" />
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff' }}>
            Round {currentRound} of {totalRounds}
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#c5f74a', fontWeight: 700 }}>
          Code: {partyState?.code}
        </span>
      </div>



      <Player
        previewUrl={roundData?.previewUrl}
        songId={roundData?.targetSongId}
        apiBaseUrl={apiBaseUrl}
        guessDurationsMs={roundData?.guessDurationsMs}
        currentIndex={currentIndex}
        isGameOver={isGameOver}
        onSelectStep={handleSelectStep}
        disabled={isSubmitting}
      />

      {!isGameOver ? (
        <SearchAutocomplete
          onMakeGuess={handleMakeGuess}
          onSkip={handleSkip}
          disabled={isGameOver || isSubmitting}
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

          {currentRound < totalRounds ? (
            <button
              className="btn-submit"
              onClick={handleNextRound}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #c5f74a, #a5d637)',
                padding: '14px 24px',
                borderRadius: 16,
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 25px rgba(197, 247, 74, 0.4)'
              }}
            >
              <span>Next Round ({currentRound + 1} / {totalRounds})</span>
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              className="btn-submit"
              onClick={() => setShowFinalStandings(true)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f59e0b, #c5f74a)',
                padding: '14px 24px',
                borderRadius: 16,
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)'
              }}
            >
              <Trophy size={20} />
              <span>View Final Party Standings 🏆</span>
            </button>
          )}
        </div>
      )}
      {submissionError && <p className="audio-error" role="alert">{submissionError}</p>}
      <GuessGrid
        guesses={guesses}
        maxGuesses={roundData?.maxGuesses || 6}
        currentIndex={currentIndex}
        onSelectStep={handleSelectStep}
        disabled={isSubmitting}
      />
    </main>
  );
}
