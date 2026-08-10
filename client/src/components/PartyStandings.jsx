import React, { useState } from 'react';
import { Trophy, Award, Medal, Share2, LogOut, Check } from 'lucide-react';

export default function PartyStandings({ partyState, anonId, onLeaveParty }) {
  const [copied, setCopied] = useState(false);

  const standings = partyState?.standings || [];
  const top1 = standings[0];
  const top2 = standings[1];
  const top3 = standings[2];

  const handleCopyShare = () => {
    const lines = [`🎉 Party Versus Results (Room: ${partyState?.code})`];
    standings.forEach((s) => {
      const medal = s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`;
      lines.push(`${medal} ${s.displayName}: ${s.totalScore.toLocaleString()} pts`);
    });
    lines.push(`\nPlay at: ${window.location.origin}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ maxWidth: 520, margin: '20px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(139, 92, 246, 0.2))',
        border: '1px solid rgba(236, 72, 153, 0.4)',
        borderRadius: 24,
        padding: 24,
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Trophy size={40} color="#f59e0b" />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
          Party Game Complete!
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {partyState?.numRounds} Rounds Played • Room {partyState?.code}
        </p>

        {/* PODIUM VISUALIZATION */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 24, height: 140 }}>
          {/* 2nd Place */}
          {top2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: top2.avatarColor || '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#fff',
                marginBottom: 6,
                border: '2px solid #94a3b8'
              }}>
                {(top2.displayName[0] || '?').toUpperCase()}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                {top2.displayName}
              </span>
              <div style={{
                background: 'linear-gradient(180deg, #94a3b8, #64748b)',
                width: '100%',
                height: 70,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                color: '#fff',
                marginTop: 6
              }}>
                🥈 2nd
              </div>
            </div>
          ) : <div style={{ width: 90 }} />}

          {/* 1st Place */}
          {top1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 100 }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: top1.avatarColor || '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#fff',
                fontSize: '1.2rem',
                marginBottom: 6,
                border: '3px solid #f59e0b',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.5)'
              }}>
                {(top1.displayName[0] || '?').toUpperCase()}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f59e0b', textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                {top1.displayName}
              </span>
              <div style={{
                background: 'linear-gradient(180deg, #f59e0b, #d97706)',
                width: '100%',
                height: 95,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.4rem',
                color: '#fff',
                marginTop: 6
              }}>
                🥇 1st
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 90 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: top3.avatarColor || '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                color: '#fff',
                marginBottom: 6,
                border: '2px solid #b45309'
              }}>
                {(top3.displayName[0] || '?').toUpperCase()}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', textAlign: 'center', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                {top3.displayName}
              </span>
              <div style={{
                background: 'linear-gradient(180deg, #b45309, #78350f)',
                width: '100%',
                height: 50,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.1rem',
                color: '#fff',
                marginTop: 6
              }}>
                🥉 3rd
              </div>
            </div>
          ) : <div style={{ width: 90 }} />}
        </div>
      </div>

      {/* Full Leaderboard List */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: 20,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>Full Party Standings</h3>
        {standings.map((s) => {
          const isMe = s.anonId === anonId;
          const medal = s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`;

          return (
            <div
              key={s.anonId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 12,
                background: isMe ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: isMe ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 24, textAlign: 'center', fontWeight: 800 }}>{medal}</span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: s.avatarColor || '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  color: '#fff',
                  fontSize: '0.85rem'
                }}>
                  {(s.displayName[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{s.displayName}</span>
                    {isMe && <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>YOU</span>}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {s.roundsCompleted} of {partyState?.numRounds} rounds completed
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--status-correct)' }}>
                {s.totalScore.toLocaleString()} pts
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="share-btn"
          onClick={handleCopyShare}
          style={{ flex: 1, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', marginTop: 0 }}
        >
          {copied ? <Check size={18} /> : <Share2 size={18} />}
          <span>{copied ? 'Copied Results!' : 'Share Results'}</span>
        </button>

        <button
          className="share-btn"
          onClick={onLeaveParty}
          style={{ background: 'rgba(255, 255, 255, 0.08)', width: 'auto', padding: '0 20px', marginTop: 0 }}
          title="Back to Solo Game"
        >
          <LogOut size={18} />
          <span>Exit Party</span>
        </button>
      </div>
    </div>
  );
}
