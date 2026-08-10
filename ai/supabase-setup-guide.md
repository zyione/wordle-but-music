# 🚀 Complete Supabase Setup Guide: Song Guesser

This guide provides step-by-step instructions for setting up **Supabase** as your cloud PostgreSQL database for **Song Guesser**. This ensures user profiles, leaderboard scores, and party rooms persist permanently (bypassing Render's free tier ephemeral disk reset).

---

## 📋 Overview of Steps

1. [Create a Supabase Project](#step-1-create-a-supabase-project)
2. [Execute SQL Schema Migration](#step-2-execute-sql-schema-migration)
3. [Retrieve API Credentials](#step-3-retrieve-api-credentials)
4. [Configure Render Environment Variables (Backend)](#step-4-configure-render-environment-variables)
5. [Configure Local Environment (Optional)](#step-5-configure-local-environment)
6. [Verify Supabase Integration](#step-6-verify-supabase-integration)

---

## Step 1: Create a Supabase Project

1. Open [https://supabase.com](https://supabase.com) in your browser.
2. Log in or sign up for a free Supabase account.
3. Click **New Project** in the dashboard.
4. Fill in the project details:
   - **Name**: `wordle-but-music` (or any name you prefer)
   - **Database Password**: Set a strong password (and save it securely)
   - **Region**: Select a region close to your users (e.g. `US East (N. Virginia)` or `Singapore`)
   - **Pricing Plan**: Free Tier ($0/month)
5. Click **Create new project** and wait ~1-2 minutes for Supabase to provision your database.

---

## Step 2: Execute SQL Schema Migration

1. In the Supabase Dashboard, click on **SQL Editor** (icon with `>_` in the left sidebar navigation).
2. Click **+ New Query**.
3. Copy and paste the entire SQL script below into the query window:

```sql
-- 1. Songs Table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    artwork_url TEXT,
    preview_url TEXT NOT NULL,
    source TEXT DEFAULT 'deezer',
    source_track_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Daily Puzzles Table
CREATE TABLE IF NOT EXISTS puzzles (
    id SERIAL PRIMARY KEY,
    puzzle_date DATE UNIQUE NOT NULL,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Anonymous Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    anon_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Profiles Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    anon_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Daily Attempts & Scores Table
CREATE TABLE IF NOT EXISTS attempts (
    id SERIAL PRIMARY KEY,
    puzzle_id INTEGER NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    guesses_used INTEGER DEFAULT 0,
    is_solved BOOLEAN DEFAULT FALSE,
    score INTEGER DEFAULT 0,
    time_taken_ms INTEGER DEFAULT 0,
    skips_used INTEGER DEFAULT 0,
    wrong_guesses INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(puzzle_id, session_id)
);

-- 6. Individual Guess Log Table
CREATE TABLE IF NOT EXISTS guesses (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    guess_number INTEGER NOT NULL,
    guessed_song_id INTEGER REFERENCES songs(id),
    is_correct BOOLEAN DEFAULT FALSE,
    guessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Party Rooms Table
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    host_anon_id TEXT NOT NULL,
    status TEXT DEFAULT 'lobby',
    num_rounds INTEGER DEFAULT 5,
    max_players INTEGER DEFAULT 10,
    song_source TEXT DEFAULT 'random',
    playlist_url TEXT,
    playlist_song_ids TEXT,
    seed TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Party Room Members Table
CREATE TABLE IF NOT EXISTS party_members (
    id SERIAL PRIMARY KEY,
    party_code TEXT NOT NULL REFERENCES parties(code) ON DELETE CASCADE,
    anon_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_color TEXT DEFAULT '#3b82f6',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(party_code, anon_id)
);

-- 9. Party Room Scores Table
CREATE TABLE IF NOT EXISTS party_scores (
    id SERIAL PRIMARY KEY,
    party_code TEXT NOT NULL REFERENCES parties(code) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    anon_id TEXT NOT NULL,
    song_id INTEGER REFERENCES songs(id),
    score INTEGER DEFAULT 0,
    guesses_used INTEGER DEFAULT 0,
    time_taken_ms INTEGER DEFAULT 0,
    is_solved BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(party_code, round_number, anon_id)
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_puzzles_date ON puzzles(puzzle_date);
CREATE INDEX IF NOT EXISTS idx_attempts_score ON attempts(score DESC);
CREATE INDEX IF NOT EXISTS idx_party_code ON party_members(party_code);
CREATE INDEX IF NOT EXISTS idx_party_scores ON party_scores(party_code, round_number);
```

4. Click the green **Run** button (or press `Ctrl + Enter`).
5. You should see `Success. No rows returned.` in the output pane.

---

## Step 3: Retrieve API Credentials

1. In your Supabase Dashboard, click on **Project Settings** (gear icon ⚙️ in the bottom left sidebar).
2. Click on **API** under Configuration.
3. Find the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`)
   - **`service_role` Secret Key** (Click *Reveal* to copy this key; this is required so your Express backend can write scores and management data).

> ⚠️ **Important**: Use the **`service_role` key** (not the public `anon` key) for backend server integration so backend operations have full database permissions.

---

## Step 4: Configure Render Environment Variables

1. Go to your Render Dashboard at [https://dashboard.render.com](https://dashboard.render.com).
2. Click on your Web Service: **`wordle-but-music`**.
3. In the left menu, click **Environment**.
4. Click **Add Environment Variable** and add the following two key-value pairs:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` | Your project URL from Step 3 |
| `SUPABASE_KEY` | `eyJhbGciOi...` | Your `service_role` secret key from Step 3 |

5. Click **Save Changes**.
6. Render will automatically start a new deployment. Once deployed, your backend will automatically stream all queries directly to Supabase!

---

## Step 5: Configure Local Environment (Optional)

If you want your local development server (`npm run dev`) to connect to Supabase instead of local SQLite:

1. Open `c:\Users\PC\Desktop\projects\wordlemusic\server\.env`.
2. Add your Supabase credentials:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
DB_PATH=./data/songs.db
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...
```

3. Restart your backend server.

---

## Step 6: Verify Supabase Integration

1. In Supabase Dashboard, click on **Table Editor** (grid icon 📊 in the left sidebar).
2. Click on the `users`, `attempts`, `parties`, or `songs` table.
3. Play a game on your deployed site or local app.
4. Refresh the Supabase Table Editor — you will instantly see new rows populated in real time!

---

## ❓ FAQ & Troubleshooting

- **What happens if Supabase credentials are missing?**
  - Your server automatically detects that `SUPABASE_URL` is absent and falls back to local SQLite (`sql.js`) seamlessly without crashing!
- **Will existing song seeds copy over?**
  - Yes! When the server starts up with Supabase connected, the built-in auto-seeder (`seedIfEmpty()`) automatically populates the `songs` table in Supabase if it's empty.
