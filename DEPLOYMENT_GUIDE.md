# 🌐 Free Deployment Guide & Gotchas: Song Guesser

This guide provides step-by-step instructions for hosting **Song Guesser** 100% free of charge, along with crucial caveats and things to be wary of.

---

## 🏗 Architecture Overview

Song Guesser consists of two main parts:
1. **Frontend (`/client`)**: A Vite React single-page app. Can be hosted anywhere static files are served.
2. **Backend (`/server`)**: An Express Node.js REST API with a local SQLite database (`songs.db`). Requires a persistent disk container environment.

---

## 🚀 Recommended Deployment Stack (100% Free)

- **Frontend**: **Vercel** or **Netlify** (Free forever, global CDN, HTTPS included).
- **Backend**: **Render.com** (Free Web Service + Persistent Disk).

---

## Part 1: Deploying the Backend on Render.com

Render offers a free web service tier and allows attaching a persistent disk so your SQLite database file survives restarts and deployments.

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

### Step 1.2: Add Persistent Disk (Crucial for SQLite)
1. In your Render service sidebar, click **Disks** → **Add Disk**.
2. **Name**: `sqlite-data`
3. **Mount Path**: `/data`
4. **Size**: `1 GB` (Plenty for SQLite)

### Step 1.3: Set Environment Variables on Render
Go to **Environment Variables** in Render and add:
- `PORT`: `4000`
- `DB_PATH`: `/data/songs.db`
- `CLIENT_ORIGIN`: `https://your-frontend.vercel.app` *(update once frontend is created)*

### Step 1.4: Run Database Seed on Render
Once the backend deploys successfully:
1. Open Render's **Shell** tab in your service dashboard.
2. Run:
   ```bash
   npm run seed
   ```
This populates your production SQLite database with 50 top hit tracks!

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

### 1. Render Cold Starts / Sleeping (15-min Inactivity)
> [!WARNING]
> On Render's free tier, the backend web service goes to sleep after **15 minutes of no incoming requests**.
> - **The Symptom**: The first player visiting your site after inactivity may experience a 30-second delay while Render wakes up the server.
> - **How to Fix (Free Mitigator)**:
>   Sign up for a free pinging service like [UptimeRobot.com](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org) and set up a HTTP ping to `https://your-backend.onrender.com/health` every **10 minutes**. This keeps your free server awake 24/7!

### 2. SQLite Database File Persistence
> [!CAUTION]
> If you deploy the backend on a serverless platform (like Vercel Functions or Netlify Functions) or a container without a persistent disk, **your SQLite `.db` file will reset or be deleted on every deploy/restart!**
> - Always use Render with a **Render Disk** mounted at `/data`, or use a cloud database (like Supabase PostgreSQL or Turso SQLite) if migrating away from local SQLite.

### 3. Mixed Content Errors (HTTPS vs HTTP)
> [!WARNING]
> Vercel and Netlify enforce HTTPS (`https://...`).
> - If your frontend is loaded via `HTTPS`, your backend URL (`VITE_API_BASE_URL`) **MUST also use `HTTPS`** (e.g. `https://song-guesser-backend.onrender.com`).
> - If you accidentally use `http://`, the browser will block all API calls due to Mixed Content security rules.

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
- [ ] Click Play → Audio snippet plays correctly.
- [ ] Submit a guess → Guess is evaluated and recorded.
- [ ] Test Spotify Mode → Import a Spotify playlist URL and verify live progress streaming.
- [ ] Set up UptimeRobot ping to `/health` to prevent server cold starts.
