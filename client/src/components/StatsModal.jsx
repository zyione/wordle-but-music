import React from 'react';
import { X, Award, Flame, Target } from 'lucide-react';

export default function StatsModal({ stats, onClose }) {
  const { played = 0, won = 0, currentStreak = 0, maxStreak = 0 } = stats || {};
  const winPercent = played > 0 ? Math.round((won / played) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Your Statistics</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

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
      </div>
    </div>
  );
}
