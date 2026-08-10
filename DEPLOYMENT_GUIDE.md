# 🌐 Free Deployment Guide & Gotchas: Song Guesser

This guide provides step-by-step instructions for hosting **Song Guesser** 100% free of charge, along with crucial caveats and things to be wary of.

---

## 🏗 Architecture Overview

Song Guesser consists of two main parts:
1. **Frontend (`/client`)**: A Vite React single-page app. Hostable for free on Vercel, Netlify, or Cloudflare Pages.
2. **Backend (`/server`)**: An Express Node.js REST API with a local SQLite database (`songs.db`) and a built-in cross-browser audio proxy (`/api/audio/proxy`). Automatically auto-seeds itself on boot for zero-config deployment.

---

## 🚀 Recommended Deployment Stack (100% Free)

- **Frontend**: **Vercel** or **Netlify** (Free forever, global CDN, HTTPS included).
- **Backend**: **Render.com** (Free Web Service).

---

## Part 1: Deploying the Backend on Render.com

Render offers a 100% free web service instance type for Node.js backend apps.

### Step 1.1: Create Render Web Service
1. Sign up / Log in to [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`https://github.com/zyione/wordle-but-music`).
4. Configure service settings:
   - **Name**: `song-guesser-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 1.2: Set Environment Variables on Render
Go to **Environment Variables** in Render and add:
- `PORT`: `4000`
- `CLIENT_ORIGIN`: `https://your-frontend.vercel.app` *(update once frontend is deployed)*

> [!NOTE]
> Render Free Instances do not support persistent disk addons. Song Guesser includes an **automatic boot-seeding mechanism (`seedIfEmpty()`)**. Whenever the free Render instance starts or wakes up, it automatically checks SQLite and seeds 50 hit tracks + Today's Puzzle in 1-2 seconds with zero manual configuration required!

---

## Part 2: Deploying the Frontend on Vercel

Vercel provides free, high-performance static hosting with automatic HTTPS.

### Step 2.1: Import Project to Vercel
1. Log in to [Vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`zyione/wordle-but-music`).
4. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2.2: Set Environment Variables on Vercel
Under **Environment Variables**, add:
- `VITE_API_BASE_URL`: `https://song-guesser-backend.onrender.com` *(Replace with your exact Render backend URL)*

Click **Deploy**! Your frontend will be live at `https://your-project.vercel.app`.

---

## ⚠️ Things You MUST Be Wary Of (Gotchas & Caveats)

### 1. Render Free Tier Cold Starts (15-min Inactivity)
> [!WARNING]
> On Render's free tier, free instances spin down / go to sleep after **15 minutes of inactivity**.
> - **The Symptom**: The first player visiting your site after inactivity may experience a ~30-second delay while Render spins up the container.
> - **How to Fix (Free 24/7 Keep-Alive)**:
>   Sign up for a free pinging service like [UptimeRobot.com](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org) and set up an HTTP ping to `https://your-backend.onrender.com/health` every **10 minutes**. This keeps your free server awake 24/7!

### 2. Ephemeral Storage on Free Hosts & Automatic Boot-Seeding
> [!IMPORTANT]
> Render Free Instances do not support persistent disks. If the free server spins down or redeploys, non-persistent storage is reset.
> - **How Song Guesser Handles This**: Our server includes `seedIfEmpty()`. On startup, if the database is fresh or empty, it automatically populates the 50 hit tracks and schedules Today's Puzzle so the game is 100% playable out of the box with zero manual terminal commands!

### 3. Mixed Content Errors & Cross-Browser Audio Proxying
> [!IMPORTANT]
> Vercel and Netlify enforce HTTPS (`https://...`).
> - If your frontend is loaded via `HTTPS`, your backend URL (`VITE_API_BASE_URL`) **MUST also use `HTTPS`** (e.g. `https://song-guesser-backend.onrender.com`).
> - Browsers like **Zen Browser**, **Firefox**, and **Chrome** enforce strict CORS on media streams. Song Guesser includes an automated fallback proxy (`/api/audio/proxy?url=...`) that automatically proxies external CDN preview streams through your backend with proper `Access-Control-Allow-Origin: *` headers, ensuring 100% audio playback reliability across all browsers and devices!

### 4. CORS Misconfiguration
> [!IMPORTANT]
> Make sure `CLIENT_ORIGIN` in your backend environment variables matches your exact Vercel frontend URL (without trailing slash):
> ```
> CLIENT_ORIGIN=https://wordle-but-music.vercel.app
> ```
> If `CLIENT_ORIGIN` is incorrect, the browser will block `POST /api/guess` and `POST /api/spotify/import` requests with CORS errors.

---

## ✅ Post-Deployment Verification Checklist

- [ ] Visit `https://your-backend.onrender.com/health` → Should return `{"status":"ok"}`.
- [ ] Visit your Vercel frontend URL → App loads cleanly without errors.
- [ ] Click Play → Audio snippet plays correctly in Chrome, Firefox, and Zen Browser.
- [ ] Submit a guess → Guess is evaluated and recorded.
- [ ] Test Unlimited Mode → Verify non-repeating song selection works across sessions.
- [ ] Test Spotify Mode → Import a Spotify playlist URL and verify live background stream.
- [ ] Set up UptimeRobot ping to `/health` to prevent server cold starts.
