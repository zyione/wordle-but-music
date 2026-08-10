# 🎵 Song Guesser (Heardle-Style Music Game)

A daily music guessing game built with **React (Vite)**, **Node.js (Express)**, **SQLite**, and the **Deezer API**. 

Players listen to increasingly long snippets of a daily mystery song intro (1s, 2s, 4s, 7s, 11s, 16s) and try to guess the correct title and artist in 6 attempts or less.

---

## 🚀 Quick Start Guide

### 1. Installation
Clone the repository and install all dependencies:

```bash
git clone https://github.com/zyione/wordle-but-music.git
cd wordle-but-music

# Install root dependencies
npm install

# Install server & client dependencies
npm install --prefix server
npm install --prefix client
```

### 2. Database Seed & Initial Setup
Seed the SQLite database with 50 popular hit songs automatically fetched from the Deezer API:

```bash
npm run seed
```

### 3. Run the Game Locally
Start both the backend server (`http://localhost:4000`) and frontend client (`http://localhost:5173`) simultaneously:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to start playing!

---

## 🎮 How to Use & Play Overall

1. **Listen to the snippet**: Click the big **Play** button to hear the audio preview.
2. **Guess count unlocks longer clips**:
   - **Guess 1**: 1 second
   - **Guess 2**: 2 seconds
   - **Guess 3**: 4 seconds
   - **Guess 4**: 7 seconds
   - **Guess 5**: 11 seconds
   - **Guess 6**: 16 seconds (Full snippet duration)
3. **Search & Submit**: Type into the search box to autocomplete against the game's song database. Pick a song and click **Submit**, or click **Skip** to advance to the next snippet length without making a guess.
4. **Win or Lose Reveal**: On a correct guess or after 6 attempts, the full song title, artist, album cover, and full 30-second preview are revealed!
5. **Share Result**: Click **Share Your Result** to copy a Wordle-style color grid (e.g. `🟩🟧🟥⬛⬛⬛`) to your clipboard.

---

## ➕ How to Add Missing Songs

You **never** have to manually download `.mp3` files or upload images! Everything is pulled automatically from the free Deezer API.

### Method 1: Instant Add via Admin API (Recommended)
You can add any missing song while the server is running by sending a `POST` request to `http://localhost:4000/admin/songs`. The server will look up the track on Deezer, grab the 30s preview audio stream URL + album artwork, and insert it into your database immediately!

#### Using `curl` (Terminal / Command Prompt):
```bash
curl -X POST http://localhost:4000/admin/songs \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Bohemian Rhapsody\", \"artist\": \"Queen\"}"
```

#### Using Postman / Insomnia / Thunder Client:
- **Method**: `POST`
- **URL**: `http://localhost:4000/admin/songs`
- **Headers**: `Content-Type: application/json`
- **Body (JSON)**:
  ```json
  {
    "title": "Espresso",
    "artist": "Sabrina Carpenter"
  }
  ```

---

### Method 2: Bulk Add via `seedList.json`

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

### 📅 Method 3: Schedule a Specific Song for Today or a Future Date

By default, the server auto-selects a random unused song for every new date. If you want to force a specific song for a specific date:

Send a `POST` request to `http://localhost:4000/admin/puzzle`:

```json
{
  "date": "2026-08-12",
  "songId": 5
}
```

---

## 🎮 Game Modes

- **📅 Daily Mode**: 1 mystery song per calendar date. Progress is tracked and saved for today.
- **♾️ Unlimited Mode**: Play non-stop with endless random songs from your database!
- **🎧 Spotify Playlist Mode**: Paste **any public Spotify Playlist link**! The app extracts the playlist tracks, finds the audio previews via Deezer, and lets you play songs exclusively from that Spotify playlist!

---

## 🎧 How to Use Spotify Playlist Mode

1. In the header, click the **Spotify 🎧** mode button.
2. A pop-up dialog will ask for your Spotify playlist link:
   ```
   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
   ```
3. Click **Import Spotify Playlist**. The app will extract the tracklist, match the audio previews, and load the custom playlist.
4. Click **Start Playing This Playlist 🎧** to start guessing!
5. After finishing each song, click **Play Next Song 🔀** to pick another random track from your imported Spotify playlist!

---

## 🔌 API Endpoints Summary

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/config` | Returns audio snippet duration thresholds and max guesses |
| `GET` | `/api/puzzle/today` | Returns today's daily puzzle ID & preview audio stream URL |
| `GET` | `/api/puzzle/random` | Returns a random song puzzle for Unlimited Mode |
| `POST` | `/api/spotify/import` | Body: `{ playlistUrl }` → parses Spotify playlist & fetches Deezer previews |
| `GET` | `/api/puzzle/spotify` | Query: `?songIds=1,2,3...` → returns a random song puzzle from Spotify playlist |
| `GET` | `/api/search?q=` | Live autocomplete search against local song database |
| `POST` | `/api/guess` | Body: `{ puzzleId, anonId, songId, isSkip, mode }` → validates guess |
| `POST` | `/admin/songs` | Body: `{ title, artist }` → fetches Deezer preview & artwork, adds to DB |
| `POST` | `/admin/puzzle` | Body: `{ date, songId }` → schedules target song for a calendar date |
| `GET` | `/admin/songs` | Returns list of all songs in database |

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
