import React, { useState } from 'react';
import { X, User, Check, Sparkles, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ProfileModal({ userProfile, onSaveProfile, onClose }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [pin, setPin] = useState(localStorage.getItem('song_guesser_user_pin') || '');
  const [avatarColor, setAvatarColor] = useState(userProfile?.avatarColor || PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    if (!pin.trim() || !/^\d{4}$/.test(pin.trim())) {
      setErrorMsg('Please enter a 4-digit numeric PIN (e.g. 1234)');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const result = await onSaveProfile({
        displayName: displayName.trim(),
        pin: pin.trim(),
        avatarColor
      });

      if (result?.error) {
        setErrorMsg(result.error);
        setSaving(false);
        return;
      }

      localStorage.setItem('song_guesser_user_pin', pin.trim());
      setSaving(false);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save profile');
      setSaving(false);
    }
  };

  const handlePinChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    if (errorMsg) setErrorMsg(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={22} color="var(--accent-primary)" />
            <h2 className="modal-title">{userProfile?.displayName ? 'Edit Profile & PIN' : 'Set Profile & 4-Digit PIN'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Informational Banner */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.8rem',
          color: '#93c5fd'
        }}>
          <ShieldCheck size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
          <span>
            Set a 4-digit PIN to protect your name. If you use a name registered previously, enter your PIN to log in!
          </span>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 14,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.82rem',
            color: '#fca5a5'
          }}>
            <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>
          {/* Avatar Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.7rem',
              fontWeight: 800,
              color: '#fff',
              boxShadow: `0 8px 24px ${avatarColor}55`,
              transition: 'all 0.2s ease'
            }}>
              {(displayName.trim()[0] || '?').toUpperCase()}
            </div>

            {/* Color Palette */}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: color,
                    border: avatarColor === color ? '3px solid #fff' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: avatarColor === color ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {avatarColor === color && <Check size={14} color="#fff" />}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Display Name
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="e.g. BeatMaster99"
              maxLength={25}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              required
              autoFocus
              style={{ padding: '12px 16px', borderRadius: 12 }}
            />
          </div>

          {/* 4-Digit PIN Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} color="#ec4899" />
              <span>4-Digit Secret PIN</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              className="search-input"
              placeholder="Enter 4-digit PIN (e.g. 1234)"
              maxLength={4}
              value={pin}
              onChange={handlePinChange}
              required
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                letterSpacing: '4px',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={saving || !displayName.trim() || pin.length < 4}
            style={{
              marginTop: 4,
              padding: '14px 0',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              fontWeight: 800
            }}
          >
            <Sparkles size={18} />
            <span>{saving ? 'Saving...' : 'Save & Log In Profile'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
