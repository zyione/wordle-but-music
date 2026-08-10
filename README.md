# 🎵 Song Guesser (Heardle-Style Music Game)

A daily music guessing game built with **React (Vite)**, **Node.js (Express)**, **SQLite**, and the **Deezer API**. 

Players listen to increasingly long snippets of a mystery song intro (1s, 2s, 4s, 7s, 11s, 16s) and try to guess the correct title and artist in 6 attempts or less.

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

---

## 🌐 Free Deployment Guide

Want to host Song Guesser online for free? Read our complete step-by-step guide:
👉 **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** *(Covers Vercel + Render free tier setup, persistent SQLite disks, CORS, cross-browser audio proxies, and 24/7 cold start mitigations!)*

---

### 3. Run the Game Locally
Start both the backend server (`http://localhost:4000`) and frontend client (`http://localhost:5173`) simultaneously:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser to start playing!

---

## 🎮 How to Use & Play Overall

1. **Listen to the snippet**: Click the **Play** button to hear the audio preview snippet.
2. **Snippet duration increases per step**:
   - **Attempt 1**: 1 second
   - **Attempt 2**: 2 seconds
   - **Attempt 3**: 4 seconds
   - **Attempt 4**: 7 seconds
   - **Attempt 5**: 11 seconds
   - **Attempt 6**: 16 seconds (Full snippet duration)
3. **Interactive Step & Timeline Skipping**: Click any timeline tick mark or future guess row to instantly skip to that attempt level.
4. **Search & Submit**: Type into the search box to autocomplete against the song database. Pick a song and click **Submit**, or click **Skip** to advance snippet duration.
5. **Win or Lose Reveal**: On a correct guess or after 6 attempts, the full song title, artist, album cover, and full 30-second preview are revealed with auto-playing audio!
6. **Share Result**: Click **Share Your Result** to copy a Wordle-style color grid (e.g. `🟩🟧🟥⬛⬛⬛`) to your clipboard.

---

## 🎧 Game Modes

- **📅 Daily Mode**: 1 mystery song per calendar date. Progress is tracked and saved locally for today.
- **♾️ Unlimited Mode**: Play non-stop with endless random songs from your database! Features **Session No-Repeat** tracking so songs never repeat in one sitting.
- **🎧 Spotify Playlist Mode**: Paste **any public Spotify Playlist link**!
  - **Zero Downtime**: Game launches instantly as soon as the 1st song matches (~0.5s)!
  - **Background Import**: Non-intrusive status pill updates live as songs process in the background (`Importing Spotify Playlist Track 12 of 50...`).
  - **Playlist Caching**: Imported playlists are cached in `localStorage` for instant 1-click loading anytime!

---

## ➕ How to Add Missing Songs

You **never** have to manually download `.mp3` files or upload images! Everything is pulled automatically from the free Deezer API.

### Method 1: Instant Add via Admin API (Recommended)
Add any missing song while the server is running by sending a `POST` request to `http://localhost:4000/admin/songs`:

#### Using `curl`:
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

---

### 📅 Method 3: Schedule a Specific Song for Today or a Future Date

Send a `POST` request to `http://localhost:4000/admin/puzzle`:

```json
{
  "date": "2026-08-12",
  "songId": 5
}
```

---

## 🔌 API Endpoints Summary

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/config` | Returns audio snippet duration thresholds and max guesses |
| `GET` | `/api/puzzle/today` | Returns today's daily puzzle ID & preview audio stream URL |
| `GET` | `/api/puzzle/random` | Returns a non-repeating random song puzzle for Unlimited Mode |
| `POST` | `/api/spotify/import` | Body: `{ playlistUrl }` → parses Spotify playlist & streams Deezer previews |
| `GET` | `/api/puzzle/spotify` | Query: `?songIds=1,2,3...&excludeIds=1,2` → returns a random song puzzle from Spotify playlist |
| `GET` | `/api/audio/proxy` | Query: `?url=...` → Audio proxy for 100% cross-browser playback (Zen, Firefox, Chrome, Safari) |
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
│   ├── /routes          -> config.js, puzzle.js, search.js, guess.js, admin.js, spotify.js, audioProxy.js
│   ├── /services        -> deezerClient.js (Deezer API fetcher), spotifyClient.js
│   └── index.js         -> Express server entry point
├── /client
│   ├── /src
│   │   ├── /components  -> Header, GuessGrid, Player, SearchAutocomplete, ResultModal, SpotifyModal, etc.
│   │   ├── App.jsx      -> Main game state, LocalStorage persistence & streaming audio logic
│   │   └── index.css    -> Dark mode glassmorphism styles
│   ├── index.html
│   └── vite.config.js
└── package.json         -> Monorepo workspace scripts (`npm run dev`)
```

---

## 📜 License

MIT License — feel free to customize, modify, and host your own daily music guessing game!
