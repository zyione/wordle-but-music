import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Play, Crown, Loader2, LogOut } from 'lucide-react';

export default function PartyLobby({ partyState, anonId, apiBaseUrl, onStartGame, onLeaveParty, onStateUpdate }) {
  const [copied, setCopied] = useState(false);

  const isHost = partyState?.hostAnonId === anonId;
  const members = partyState?.members || [];
  const maxPlayers = partyState?.maxPlayers || 10;

  // Poll for party state updates every 2.5 seconds
  useEffect(() => {
    if (!partyState?.code) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/party/${partyState.code}?anonId=${anonId}`);
        if (res.ok) {
          const updated = await res.json();
          onStateUpdate(updated);
        }
      } catch (err) {
        console.warn('Lobby poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [partyState?.code, apiBaseUrl, anonId, onStateUpdate]);

  const handleCopyCode = () => {
    if (!partyState?.code) return;
    navigator.clipboard.writeText(partyState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 520, margin: '20px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Lobby Header Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: 20,
        padding: 24,
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        position: 'relative'
      }}>
        <button
          onClick={onLeaveParty}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            color: 'var(--text-muted)',
            borderRadius: 12,
            padding: 8,
            cursor: 'pointer'
          }}
          title="Leave Room"
        >
          <LogOut size={18} />
        </button>

        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Party Room Share Code
        </span>

        {/* Big Code & Copy Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <span style={{
            fontSize: '2.4rem',
            fontWeight: 900,
            letterSpacing: '6px',
            color: '#ec4899',
            fontFamily: 'monospace'
          }}>
            {partyState?.code}
          </span>
          <button
            onClick={handleCopyCode}
            style={{
              background: copied ? '#10b981' : 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              color: copied ? '#fff' : '#ec4899',
              padding: '8px 14px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Share this code with your friends! ({members.length} / {maxPlayers} players joined)
        </p>
      </div>

      {/* Member List */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-card-border)',
        borderRadius: 20,
        padding: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#ec4899" />
            <span>Players in Room</span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {partyState?.numRounds} Rounds Game
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => {
            const isMe = m.anonId === anonId;
            const isMemberHost = m.anonId === partyState?.hostAnonId;

            return (
              <div
                key={m.anonId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: isMe ? 'rgba(236, 72, 153, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: isMe ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: m.avatarColor || '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#fff',
                    fontSize: '0.9rem'
                  }}>
                    {(m.displayName[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                        {m.displayName}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isMemberHost && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    color: '#f59e0b',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '3px 8px',
                    borderRadius: 10
                  }}>
                    <Crown size={13} />
                    <span>Host</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Game Control */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        {isHost ? (
          <button
            className="btn-submit"
            onClick={onStartGame}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              padding: '14px 0',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 25px rgba(236, 72, 153, 0.4)'
            }}
          >
            <Play size={20} />
            <span>Start Game ({members.length} Player{members.length > 1 ? 's' : ''})</span>
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '14px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <Loader2 size={18} style={{ animation: 'spin 1.2s linear infinite', color: '#ec4899' }} />
            <span>Waiting for host to start game...</span>
          </div>
        )}
      </div>
    </div>
  );
}
