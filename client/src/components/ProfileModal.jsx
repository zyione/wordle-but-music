import React, { useState } from 'react';
import { X, User, Check, Sparkles, Lock, AlertCircle, ShieldCheck, ArrowLeft, Loader2, KeyRound } from 'lucide-react';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ProfileModal({ userProfile, apiBaseUrl = '', anonId = '', onSaveProfile, onClose }) {
  const [step, setStep] = useState(1); // 1 = Name Input, 2 = PIN Input & Login/Register
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [pin, setPin] = useState(localStorage.getItem('song_guesser_user_pin') || '');
  const [avatarColor, setAvatarColor] = useState(userProfile?.avatarColor || PRESET_COLORS[0]);
  
  const [isTaken, setIsTaken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Step 1: Check if username is taken
  const handleCheckName = async (e) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) return;

    try {
      setChecking(true);
      setErrorMsg(null);

      const baseUrl = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
      const res = await fetch(`${baseUrl}/api/users/check-name?displayName=${encodeURIComponent(cleanName)}&anonId=${anonId}`);
      const data = await res.json();

      setChecking(false);

      if (data.taken) {
        setIsTaken(true);
        setStep(2);
      } else {
        setIsTaken(false);
        setStep(2);
      }
    } catch (err) {
      console.warn('Name check error:', err);
      setChecking(false);
      // Fallback to Step 2
      setStep(2);
    }
  };

  // Step 2: Final Submission (Login or Register with PIN)
  const handleSubmitFinal = async (e) => {
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
            <h2 className="modal-title">
              {step === 1 ? 'Enter Your Name' : isTaken ? 'Welcome Back! Log In' : 'Create Profile & PIN'}
            </h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: Name Input & Availability Check */}
        {step === 1 && (
          <form onSubmit={handleCheckName} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.83rem',
              color: '#93c5fd'
            }}>
              <ShieldCheck size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
              <span>
                First, enter your Display Name. We'll check if it's already registered or brand new!
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
                style={{ padding: '14px 16px', borderRadius: 14, fontSize: '1rem' }}
              />
            </div>

            <button
              type="submit"
              className="btn-submit"
              disabled={checking || !displayName.trim()}
              style={{
                marginTop: 4,
                padding: '14px 0',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                fontWeight: 800,
                fontSize: '1rem'
              }}
            >
              {checking ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1.2s linear infinite' }} />
                  <span>Checking Availability...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <Sparkles size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: PIN Input & Login/Register */}
        {step === 2 && (
          <form onSubmit={handleSubmitFinal} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 4 }}>
            {/* Status Banner */}
            <div style={{
              background: isTaken ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: isTaken ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: '0.83rem',
              color: isTaken ? '#fcd34d' : '#6ee7b7'
            }}>
              {isTaken ? (
                <KeyRound size={22} color="#f59e0b" style={{ flexShrink: 0 }} />
              ) : (
                <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0 }} />
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 2 }}>
                  {isTaken ? `"${displayName}" is already registered!` : `"${displayName}" is available!`}
                </div>
                <span>
                  {isTaken
                    ? 'Enter your 4-digit PIN below to log in and sync your daily progress across devices.'
                    : 'Choose a 4-digit PIN below to protect your profile across all devices.'}
                </span>
              </div>
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

            {/* Avatar Preview & Palette (only for new profiles or editing) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#fff',
                boxShadow: `0 8px 24px ${avatarColor}55`,
                transition: 'all 0.2s ease'
              }}>
                {(displayName.trim()[0] || '?').toUpperCase()}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    style={{
                      width: 28,
                      height: 28,
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

            {/* 4-Digit PIN Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} color="#ec4899" />
                <span>Enter 4-Digit Secret PIN</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                className="search-input"
                placeholder="4-digit PIN (e.g. 1234)"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                required
                autoFocus
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  letterSpacing: '6px',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  textAlign: 'center'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="share-btn"
                onClick={() => setStep(1)}
                style={{ background: 'rgba(255, 255, 255, 0.08)', width: 'auto', padding: '0 16px', marginTop: 0 }}
                title="Change Name"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="btn-submit"
                disabled={saving || !displayName.trim() || pin.length < 4}
                style={{
                  flex: 1,
                  padding: '14px 0',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: isTaken ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'linear-gradient(135deg, #10b981, #3b82f6)',
                  fontWeight: 800
                }}
              >
                <Sparkles size={18} />
                <span>{saving ? 'Saving...' : isTaken ? 'Log In Profile' : 'Create Profile'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
