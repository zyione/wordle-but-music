import React from 'react';
import { Music2, HelpCircle, BarChart2 } from 'lucide-react';

export default function Header({ onOpenHelp, onOpenStats }) {
  return (
    <header className="app-header">
      <div className="logo-group">
        <div className="logo-icon">
          <Music2 size={22} />
        </div>
        <h1 className="app-title">Song Guesser</h1>
      </div>

      <div className="nav-actions">
        <button className="icon-btn" onClick={onOpenHelp} title="How to Play" aria-label="Help">
          <HelpCircle size={20} />
        </button>
        <button className="icon-btn" onClick={onOpenStats} title="Statistics" aria-label="Stats">
          <BarChart2 size={20} />
        </button>
      </div>
    </header>
  );
}
