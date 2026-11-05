import { apiFetch as fetch } from '../lib/api.js';
import React, { useState, useEffect, useRef } from 'react';
import { Search, FastForward, CheckCircle } from 'lucide-react';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export default function SearchAutocomplete({ onMakeGuess, onSkip, disabled, apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const [searchStatus, setSearchStatus] = useState('');

  useEffect(() => {
    if (!query.trim() || selectedSong) {
      setSuggestions([]);
      setIsOpen(false);
      setSearchStatus('');
      return;
    }
    const controller = new AbortController();
    setSuggestions([]);
    setIsOpen(false);
    setSearchStatus('Searching…');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Search unavailable');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
        setSearchStatus(data.length ? '' : 'No matches. Try another song or artist.');
      } catch (err) {
        if (!controller.signal.aborted) setSearchStatus('Search unavailable. Try again in a moment.');
      }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, selectedSong, apiBaseUrl]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (song) => {
    setSelectedSong(song);
    setQuery(`${song.title} - ${song.artist}`);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!selectedSong || disabled) return;
    onMakeGuess(selectedSong);
    setQuery('');
    setSelectedSong(null);
  };

  const handleSkipClick = () => {
    if (disabled) return;
    onSkip();
    setQuery('');
    setSelectedSong(null);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || !suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        e.preventDefault();
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="search-section" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="input-container">
        <input
          type="text"
          className="search-input"
          role="combobox"
          aria-label="Search for a song or artist"
          aria-expanded={isOpen}
          aria-controls="song-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={isOpen && selectedIndex >= 0 ? `song-option-${selectedIndex}` : undefined}
          placeholder="Search for a song or artist…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedSong(null);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <Search className="search-icon-inside" size={20} />

        {/* Dropdown popup */}
        {isOpen && (
          <div className="autocomplete-dropdown" id="song-suggestions" role="listbox" aria-label="Song suggestions">
            {suggestions.map((song, idx) => (
              <div
                key={song.id}
                id={`song-option-${idx}`}
                role="option"
                aria-selected={idx === selectedIndex}
                className={`suggestion-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(song)}
              >
                {song.artwork_url ? (
                  <img src={song.artwork_url} alt={song.title} className="suggestion-art" />
                ) : (
                  <div className="suggestion-art" />
                )}
                <div className="guess-info">
                  <span className="guess-title">{song.title}</span>
                  <span className="guess-artist">{song.artist}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>

      {searchStatus && <p className="search-status" role="status">{searchStatus}</p>}
      <div className="action-buttons">
        <button
          type="button"
          className="btn-skip"
          onClick={handleSkipClick}
          disabled={disabled}
        >
          <FastForward size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          SKIP
        </button>

        <button
          type="button"
          className="btn-submit"
          onClick={handleSubmit}
          disabled={disabled || !selectedSong}
        >
          <CheckCircle size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
          SUBMIT
        </button>
      </div>
    </div>
  );
}
