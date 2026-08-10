CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    artwork_url TEXT,
    preview_url TEXT NOT NULL,
    source TEXT DEFAULT 'deezer',
    source_track_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_date TEXT UNIQUE NOT NULL,
    song_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (song_id) REFERENCES songs(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    anon_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puzzle_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    guesses_used INTEGER DEFAULT 0,
    is_solved BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (puzzle_id) REFERENCES puzzles(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    UNIQUE(puzzle_id, session_id)
);

CREATE TABLE IF NOT EXISTS guesses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    guess_number INTEGER NOT NULL,
    guessed_song_id INTEGER,
    is_correct BOOLEAN DEFAULT 0,
    guessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attempt_id) REFERENCES attempts(id),
    FOREIGN KEY (guessed_song_id) REFERENCES songs(id)
);
