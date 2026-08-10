import React from 'react';
import { X, Volume2, Search, CheckCircle } from 'lucide-react';

export default function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">How to Play</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p>Guess the song of the day in 6 attempts or less!</p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Volume2 size={24} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Listen to the snippet:</strong> Each attempt unlocks a longer clip of the song's intro (1s, 2s, 4s, 7s, 11s, 16s).
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Search size={24} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Search & Pick:</strong> Type into the box to find song suggestions and pick the artist or title.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CheckCircle size={24} color="var(--status-correct)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Win & Share:</strong> Guess correctly or reach your 6th guess to reveal the song and share your score grid!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
