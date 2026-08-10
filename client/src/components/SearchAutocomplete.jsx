import React, { useState, useEffect, useRef } from 'react';
import { Search, FastForward, CheckCircle } from 'lucide-react';

export default function SearchAutocomplete({ onMakeGuess, onSkip, disabled, apiBaseUrl = 'https://wordle-but-music.onrender.com' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || selectedSong?.title === query) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 180);

    return () => clearTimeout(timer);
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
          placeholder="Know it? Search for artist or song name..."
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
          <div className="autocomplete-dropdown">
            {suggestions.map((song, idx) => (
              <div
                key={song.id}
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
