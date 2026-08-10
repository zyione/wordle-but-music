# 🎵 Song Guesser (Heardle-Style Music Game)

A daily music guessing game built with **React (Vite)**, **Node.js (Express)**, **SQLite**, and the **Deezer API**. 

Players listen to increasingly long snippets of a daily mystery song intro (1s, 2s, 4s, 7s, 11s, 16s) and try to guess the correct title and artist in 6 attempts or less.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18 or higher installed on your computer.

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/zyione/wordle-but-music.git
cd wordle-but-music

# Install root dependencies
npm install

# Install server & client dependencies
npm install --prefix server
npm install --prefix client
```

### 3. Database Seed & Initial Setup
Seed the SQLite database with 50 popular hit songs automatically fetched from the Deezer API:

```bash
npm run seed
```

### 4. Run the Game Locally
Start both the backend server (`http://localhost:4000`) and frontend client (`http://localhost:5173`) simultaneously:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to start playing!

---

## 🎮 How to Play Overall

1. **Listen to the snippet**: Click the big **Play** button to hear the audio preview.
2. **Guess count unlocks longer clips**:
   - Guess 1: 1 second
   - Guess 2: 2 seconds
   - Guess 3: 4 seconds
   - Guess 4: 7 seconds
   - Guess 5: 11 seconds
   - Guess 6: 16 seconds (Full snippet duration)
3. **Search & Submit**: Type in the search box to autocomplete against the game's song database. Pick a song and click **Submit**, or click **Skip** to advance to the next snippet length without making a guess.
4. **Win or Lose**: On a correct guess or after 6 attempts, the full song title, artist, album cover, and full 30-second preview are revealed!
5. **Share Result**: Click **Share Your Result** to copy a Wordle-style color grid (e.g. `🟩🟧🟥⬛⬛⬛`) to your clipboard.

---

## ➕ How to Add Missing Songs

There are **two easy ways** to expand the song database without touching complex code!

### Method 1: Using the Admin API Endpoint (Instant Add)
You can add any song directly by sending a simple HTTP POST request to your server. No manual audio downloading or image uploading required — the backend automatically looks up the song on Deezer, fetches the 30-second audio preview URL, and gets the high-resolution album cover art!

#### Using `curl` (Terminal / Command Prompt):
```bash
curl -X POST http://localhost:4000/admin/songs \
  -H "Content-Type: application/json" \
  -d '{"title": "Bohemian Rhapsody", "artist": "Queen"}'
```

#### Using Postman / Insomnia:
- **Method**: `POST`
- **URL**: `http://localhost:4000/admin/songs`
- **Headers**: `Content-Type: application/json`
- **Body (JSON)**:
  ```json
  {
    "title": "Thriller",
    "artist": "Michael Jackson"
  }
  ```

---

### Method 2: Adding to `seedList.json` (Bulk Add)

1. Open `server/db/seedList.json`.
2. Add your desired song title and artist pair to the array:
   ```json
   [
     { "title": "Blinding Lights", "artist": "The Weeknd" },
     { "title": "Your New Song Title", "artist": "Artist Name" }
   ]
   ```
3. Run the seed script:
   ```bash
   npm run seed
   ```
   This will fetch preview metadata for all new entries and update your local database!

---

### 📅 How to Schedule a Specific Song for Today or a Future Date

By default, the server auto-selects a random unused song for every new date. If you want to force a specific song for a specific date:

Send a `POST` request to `http://localhost:4000/admin/puzzle`:

```json
{
  "date": "2026-08-12",
  "songId": 5
}
```

---

## 🛠 Project Architecture

```
/wordle-but-music
├── /server
│   ├── /config          -> snippetDurations.json (configurable timers)
│   ├── /data            -> songs.db (SQLite database file)
│   ├── /db              -> schema.sql, db.js, migrate.js, seed.js, scheduleToday.js
│   ├── /routes          -> config.js, puzzle.js, search.js, guess.js, admin.js
│   ├── /services        -> deezerClient.js (Deezer API fetcher)
│   └── index.js         -> Express server entry point
├── /client
│   ├── /src
│   │   ├── /components  -> Header, GuessGrid, Player, SearchAutocomplete, ResultModal, etc.
│   │   ├── App.jsx      -> Main game state, LocalStorage persistence & audio logic
│   │   └── index.css    -> Dark mode glassmorphism styles
│   ├── index.html
│   └── vite.config.js
└── package.json         -> Monorepo workspace scripts (`npm run dev`)
```

---

## 📜 License

MIT License — feel free to customize, modify, and host your own daily music guessing game!
