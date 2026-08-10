import React, { useState, useEffect } from 'react';
import { X, Trophy, Calendar, Flame, Loader2 } from 'lucide-react';

export default function LeaderboardModal({ apiBaseUrl, anonId, onClose }) {
  const [tab, setTab] = useState('daily'); // 'daily' | 'alltime'
  const [loading, setLoading] = useState(true);
  const [dailyBoard, setDailyBoard] = useState([]);
  const [alltimeBoard, setAlltimeBoard] = useState([]);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const [dRes, aRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/leaderboard/daily`),
          fetch(`${apiBaseUrl}/api/leaderboard/alltime`)
        ]);

        if (dRes.ok) {
          const dData = await dRes.json();
          setDailyBoard(dData.leaderboard || []);
        }

        if (aRes.ok) {
          const aData = await aRes.json();
          setAlltimeBoard(aData.leaderboard || []);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, [apiBaseUrl]);

  const activeList = tab === 'daily' ? dailyBoard : alltimeBoard;

  const formatTime = (ms) => {
    if (!ms) return '-';
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={24} color="#f59e0b" />
            <h2 className="modal-title">Leaderboard</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.06)',
          padding: 4,
          borderRadius: 16,
          gap: 4,
          margin: '12px 0'
        }}>
          <button
            onClick={() => setTab('daily')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === 'daily' ? 'var(--accent-primary)' : 'transparent',
              color: tab === 'daily' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Calendar size={15} />
            <span>Today's Daily</span>
          </button>

          <button
            onClick={() => setTab('alltime')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === 'alltime' ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'transparent',
              color: tab === 'alltime' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            <Flame size={15} />
            <span>All Time Top</span>
          </button>
        </div>

        {/* Leaderboard List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1.2s linear infinite' }} />
            <p style={{ marginTop: 8, fontSize: '0.9rem' }}>Loading scores...</p>
          </div>
        ) : activeList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>No scores yet for {tab === 'daily' ? "today's puzzle" : "the leaderboard"}!</p>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Be the first to complete a game and claim #1 rank!</p>
          </div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {activeList.map((entry) => {
              const isCurrentUser = entry.anonId === anonId;
              const rankColor = entry.rank === 1 ? '#f59e0b' : entry.rank === 2 ? '#94a3b8' : entry.rank === 3 ? '#b45309' : 'var(--text-muted)';

              return (
                <div
                  key={`${entry.anonId}_${entry.rank}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: isCurrentUser ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                    border: isCurrentUser ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Left: Rank & Avatar & Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 24,
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: rankColor
                    }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </span>

                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: entry.avatarColor || '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}>
                      {(entry.displayName[0] || '?').toUpperCase()}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {entry.guessesUsed}/6 guesses • {formatTime(entry.timeTakenMs)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Score */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--status-correct)' }}>
                      {entry.score.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
