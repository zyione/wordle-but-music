import useDialog from '../hooks/useDialog.js';
import React, { useEffect, useState } from 'react';
import { API_BASE_URL, apiFetch } from '../lib/api.js';
import { X, Award, Flame, Target } from 'lucide-react';

export default function StatsModal({ onClose }) {
  const dialogRef = useDialog(onClose);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${API_BASE_URL}/api/users/stats`, { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load statistics.');
      if (!controller.signal.aborted) setStats(data);
    }).catch(err => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, []);
  const { played = 0, won = 0, currentStreak = 0, maxStreak = 0 } = stats || {};
  const winPercent = played > 0 ? Math.round((won / played) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Stats" className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Daily Statistics</h2>
          <button className="close-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <p role="alert">{error}</p>}
        {!stats && !error && <p role="status">Loading statistics…</p>}
        <p className="duration-hint">Daily challenges only · a new day starts at 00:00 UTC.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
            <h3 style={{ fontSize: '1.6rem', color: '#fff' }}>{played}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Played</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
            <h3 style={{ fontSize: '1.6rem', color: 'var(--status-correct)' }}>{winPercent}%</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Win %</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
            <h3 style={{ fontSize: '1.6rem', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Flame size={18} />
              {currentStreak}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Streak</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 }}>
            <h3 style={{ fontSize: '1.6rem', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Award size={18} />
              {maxStreak}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max Streak</span>
          </div>
        </div>
        {stats?.practice && <p className="duration-hint">Practice: {stats.practice.played} played · {stats.practice.won} won. Unlimited and Spotify games do not affect your daily streak.</p>}
      </div>
    </div>
  );
}
