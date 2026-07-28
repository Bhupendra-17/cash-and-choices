# Production Deployment Guide — Cash&Choices

This guide covers deploying the **React Frontend to Vercel** and the **Go Backend to Render or Railway** (natively, without Docker).

---

## Step 1: Deploy Go Backend (Render or Railway)

### Option A: Deploying on Render (Free / Recommended)
1. Go to [render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your Git repository.
3. Select the **`server`** directory (Root Directory = `server`).
4. Configure settings:
   - **Environment**: `Go`
   - **Build Command**: `go build -o server main.go`
   - **Start Command**: `./server`
5. Under **Environment Variables**, add:
   - `PORT`: `5000`
   - `OPENAI_API_KEY`: `your_actual_openai_api_key`
   - `ALLOWED_ORIGINS`: `https://your-app.vercel.app,*`
6. Click **Create Web Service**.
7. Copy your deployed backend URL (e.g., `https://cash-choices-backend.onrender.com`).

---

### Option B: Deploying on Railway
1. Go to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
2. Select your repository and specify the `server` folder.
3. Railway automatically detects `go.mod` and builds the Go binary natively.
4. Set Environment Variables: `OPENAI_API_KEY`, `ALLOWED_ORIGINS`.
5. Copy the generated Railway public URL (e.g., `https://cash-choices-production.up.railway.app`).

---

## Step 2: Deploy React Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New** → **Project**.
2. Import your GitHub repository.
3. Framework Preset: **Vite**.
4. Root Directory: `client` (or `./` if deploying monorepo).
5. Build Settings:
   - Build Command: `npm run build`
   - Output Directory: `dist` or `.output/public`
6. Under **Environment Variables**, add:
   - **`VITE_API_BASE_URL`**: `https://cash-choices-backend.onrender.com/api`  
     *(Replace with your actual backend URL from Step 1)*
7. Click **Deploy**.

---

## Step 3: Verify Connectivity

1. Open your Vercel deployment URL (`https://your-app.vercel.app`).
2. Navigate to **Funds Explorer** (`/funds`) and search for a mutual fund (e.g., "Parag Parikh").
3. Check browser dev tools (Network tab):
   - API requests should cleanly hit `https://cash-choices-backend.onrender.com/api/funds/search?q=Parag%20Parikh`.
4. Test **Sign Up / Log In** (`/auth`) and **Recommendation Engine** (`/recommend`).

---

## Environment Variables Summary

| Scope | Variable Name | Purpose | Example Value |
|---|---|---|---|
| **Backend** | `PORT` | HTTP port | `5000` |
| **Backend** | `OPENAI_API_KEY` | OpenAI API access key | `sk-proj-...` |
| **Backend** | `ALLOWED_ORIGINS` | CORS origins | `https://your-app.vercel.app` |
| **Frontend (Vercel)** | `VITE_API_BASE_URL` | Go backend API URL | `https://backend.onrender.com/api` |
