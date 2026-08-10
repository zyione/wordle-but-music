import React, { useState } from 'react';
import { X, User, Check, Sparkles } from 'lucide-react';

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ProfileModal({ userProfile, onSaveProfile, onClose }) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [avatarColor, setAvatarColor] = useState(userProfile?.avatarColor || PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSaving(true);
    await onSaveProfile({ displayName: displayName.trim(), avatarColor });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <User size={22} color="var(--accent-primary)" />
            <h2 className="modal-title">{userProfile?.displayName ? 'Edit Profile' : 'Welcome! Set Your Name'}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
          {/* Avatar Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: avatarColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#fff',
              boxShadow: `0 8px 24px ${avatarColor}55`,
              transition: 'all 0.2s ease'
            }}>
              {(displayName.trim()[0] || '?').toUpperCase()}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Choose your avatar color:</span>

            {/* Color Palette */}
            <div style={{ display: 'flex', gap: 10 }}>
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  style={{
                    width: 32,
                    height: 32,
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
                  {avatarColor === color && <Check size={16} color="#fff" />}
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
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              style={{ padding: '12px 16px', borderRadius: 12 }}
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={saving || !displayName.trim()}
            style={{
              marginTop: 4,
              padding: '12px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Sparkles size={18} />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
