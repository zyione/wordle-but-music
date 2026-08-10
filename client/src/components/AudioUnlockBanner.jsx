import React, { useState, useEffect } from 'react';
import { Volume2, X } from 'lucide-react';

/**
 * AudioUnlockBanner
 * 
 * Browsers block autoplay until a user gesture happens.
 * This banner:
 * 1. Shows on first visit (until user dismisses or enables)
 * 2. Plays a silent buffer to unlock the audio context
 * 3. Remembers the user's choice in localStorage
 * 4. Never shows again once dismissed
 */

const STORAGE_KEY = 'song_guesser_audio_unlocked';

export default function AudioUnlockBanner({ onUnlocked }) {
  const [visible, setVisible] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    // Only show if never dismissed before
    const alreadyUnlocked = localStorage.getItem(STORAGE_KEY);
    if (!alreadyUnlocked) {
      setVisible(true);
    } else {
      // Already granted before — silently try to unlock in background
      onUnlocked?.();
    }
  }, []);

  const handleEnable = async () => {
    setUnlocking(true);
    try {
      // Play a tiny silent audio buffer to unlock browser audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        await ctx.resume();
      }

      // Also play a silent <audio> element to unlock HTMLAudioElement autoplay
      const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      silentAudio.volume = 0;
      await silentAudio.play().catch(() => {});

      localStorage.setItem(STORAGE_KEY, '1');
      onUnlocked?.();
      setVisible(false);
    } catch (err) {
      console.warn('Audio unlock attempt failed:', err);
    } finally {
      setUnlocking(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    onUnlocked?.();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="banner"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        background: 'rgba(18, 23, 37, 0.96)',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.15)',
        backdropFilter: 'blur(16px)',
        maxWidth: 'calc(100vw - 32px)',
        width: 420,
        animation: 'slideUpBanner 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <style>{`
        @keyframes slideUpBanner {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
        }}
      >
        <Volume2 size={20} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f3f4f6', marginBottom: 2 }}>
          Enable audio to play
        </div>
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
          Your browser requires a tap to unlock sound.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleEnable}
          disabled={unlocking}
          style={{
            padding: '8px 16px',
            background: unlocking ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #2563eb, #3b82f6)',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: unlocking ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {unlocking ? 'Enabling...' : '🔊 Enable'}
        </button>

        <button
          onClick={handleDismiss}
          title="Dismiss"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
