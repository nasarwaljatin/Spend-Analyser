# 🚀 Live Deployment Guide — Spend Analyser
### Vercel (Frontend) + Render (Backend) + MongoDB Atlas (Database)

This step-by-step guide will walk you through deploying your **Spend Analyser** application completely live on free-tier cloud platforms.

---

## 📋 Architecture Overview

```mermaid
flowchart LR
    User([User Browser])
    Vercel["Frontend (Vercel)\nhttps://spend-analyser.vercel.app"]
    Render["Backend API (Render)\nhttps://spend-analyser-api.onrender.com"]
    Mongo[("Database (MongoDB Atlas)\nmongodb+srv://...")]

    User -->|Views UI| Vercel
    Vercel -->|HTTPS REST API Requests| Render
    Render -->|Prisma Client| Mongo
```

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Free Cloud Database)

1. **Create an Account**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account.

2. **Create a Free Shared Cluster**:
   - Click **"Build a Database"** → Select **M0 Free** tier.
   - Choose your preferred cloud provider (AWS/Google Cloud) and closest region (e.g. Mumbai, Singapore, Frankfurt, N. Virginia).
   - Click **"Create Deployment"**.

3. **Configure Database Credentials**:
   - Under **Security Quickstart** → **Username and Password**:
     - Username: `spend_admin` (or your choice)
     - Password: Click **"Autogenerate Secure Password"** and **COPY IT TO A SAFE PLACE**.
     - Click **"Create Database User"**.

4. **Allow Network Access (IP Whitelist)**:
   - Under **Where would you like to connect from?**:
     - Select **"Allow Access from Anywhere"** (IP address: `0.0.0.0/0`).
     - *Why?* Render instances use dynamic outgoing IP addresses.
     - Click **"Add Entry"** → Click **"Finish and Close"**.

5. **Copy Connection String**:
   - In your Atlas dashboard, click **"Connect"** → Choose **"Drivers"** (Node.js).
   - Copy the connection string. It will look like:
     ```text
     mongodb+srv://spend_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database password, and append `/spend_analyser` before the `?` query parameters:
     ```text
     mongodb+srv://spend_admin:YOUR_PASSWORD@cluster0.abcde.mongodb.net/spend_analyser?retryWrites=true&w=majority
     ```
   - Keep this string ready for Step 2.

---

## ⚙️ Step 2: Push Repository to GitHub

Ensure your latest codebase is pushed to your GitHub account:

```bash
git init
git add .
git commit -m "feat: complete spend analyser with MongoDB & Vercel deployment config"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spend-analyser.git
git push -u origin main
```

---

## 🖥️ Step 3: Deploy Backend on Render

1. **Sign Up / Log In**:
   - Go to [render.com](https://render.com) and sign in (using GitHub is recommended).

2. **Create a New Web Service**:
   - Click **"New +"** (top right) → Select **"Web Service"**.
   - Select **"Build and deploy from a Git repository"** → Click **"Next"**.
   - Connect your GitHub repository (`spend-analyser`).

3. **Configure Service Settings**:
   - **Name**: `spend-analyser-api` (or any unique name)
   - **Region**: Choose closest to your MongoDB region (e.g. Frankfurt, Oregon, Singapore)
   - **Root Directory**: `server` ⚠️ *(Crucial!)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

4. **Set Environment Variables**:
   Click **"Advanced"** → **"Add Environment Variable"** and add:

   | Key | Value | Description |
   |-----|-------|-------------|
   | `NODE_ENV` | `production` | Enables production optimizations & secure cookies |
   | `DATABASE_URL` | `mongodb+srv://spend_admin:...` | Your MongoDB Atlas connection URI from Step 1 |
   | `JWT_ACCESS_SECRET` | `generate-a-long-random-string-12345` | Access token secret |
   | `JWT_REFRESH_SECRET` | `generate-another-long-random-string-67890` | Refresh token secret |
   | `JWT_ACCESS_EXPIRY` | `15m` | Token expiry |
   | `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
   | `CLIENT_URL` | `https://your-frontend-name.vercel.app` | *Leave placeholder for now; update after Step 4* |
   | `EXCHANGE_RATE_API_URL` | `https://open.er-api.com/v6/latest` | Real-time currency exchange rates |

5. **Deploy**:
   - Click **"Create Web Service"**.
   - Render will pull your repository, install dependencies, run `npx prisma generate`, and start the Express server.
   - Once deployed, copy your Render service URL (e.g. `https://spend-analyser-api.onrender.com`).
   - Test it by opening: `https://spend-analyser-api.onrender.com/api/health` in your browser. It should return `{"status":"ok"}`!

---

## 🌐 Step 4: Deploy Frontend on Vercel

1. **Sign Up / Log In**:
   - Go to [vercel.com](https://vercel.com) and log in with your GitHub account.

2. **Import Project**:
   - Click **"Add New..."** → **"Project"**.
   - Find your repository and click **"Import"**.

3. **Configure Project**:
   - **Framework Preset**: `Vite` (Vercel usually auto-detects this)
   - **Root Directory**: Click **"Edit"** → Select `client` ⚠️ *(Crucial!)*
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)

4. **Add Environment Variables**:
   Under **"Environment Variables"**, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://spend-analyser-api.onrender.com/api` *(Your Render URL + `/api`)* |

5. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build the frontend in ~30 seconds.
   - Once finished, you will receive your live domain, e.g. `https://spend-analyser.vercel.app`!

6. **Final Handshake (Update Render `CLIENT_URL`)**:
   - Go back to your [Render Dashboard](https://dashboard.render.com).
   - Open your `spend-analyser-api` service → **"Environment"**.
   - Update `CLIENT_URL` to your exact Vercel domain (e.g. `https://spend-analyser.vercel.app`).
   - Click **"Save Changes"** (Render will automatically redeploy with the updated CORS origin).

---

## 🌱 Step 5: Seed Cloud Database (Demo Data)

To pre-populate your live MongoDB Atlas database with default categories, budgets, and sample transactions:

### Option A: From your Local Computer (Easiest)
1. In your local `server` folder, switch active schema to MongoDB:
   ```bash
   cd "d:\CODES\SPEND ANALYSER\server"
   npm run db:use:mongo
   ```
2. Run database push & seed against your live MongoDB Atlas:
   ```bash
   # In PowerShell:
   $env:DATABASE_URL="mongodb+srv://spend_admin:YOUR_PASSWORD@cluster0.xxx.mongodb.net/spend_analyser?retryWrites=true&w=majority"
   npx prisma db push
   node prisma/seed.js
   ```

### Option B: Via Render Shell
1. In Render Dashboard, open your web service → Click the **"Shell"** tab.
2. Run:
   ```bash
   node prisma/seed.js
   ```

---

## 🎯 Verification Checklist

- [ ] **Health Check**: Open `https://YOUR_BACKEND.onrender.com/api/health` → Returns `{"status":"ok"}`.
- [ ] **Frontend Loading**: Open `https://YOUR_FRONTEND.vercel.app` → Sign-in screen loads with dark glassmorphism aesthetic.
- [ ] **Demo Login**: Click **"⚡ One-Click Demo Login"** → Successfully logs in and shows the financial dashboard.
- [ ] **SPA Direct Links**: Refresh the page on `/transactions` or `/reports` → Routes render cleanly without 404 errors (handled by `vercel.json`).
- [ ] **Cross-Domain Cookies**: In DevTools Application/Storage tab, verify authentication token and cookies connect seamlessly between Vercel and Render.

---

## 💡 Free Tier Notes & Pro Tips

> [!NOTE]
> **Render Free Tier Spin-Down**:
> On the free tier, Render automatically spins down services after 15 minutes of inactivity. The first request after sleep may take **20–40 seconds** to wake up. Once awake, performance is instant.

> [!TIP]
> **Keep-Alive Cron**:
> You can set up a free 10-minute ping using services like [cron-job.org](https://cron-job.org) or [UptimeRobot](https://uptimerobot.com) to ping `https://YOUR_BACKEND.onrender.com/api/health` so your Render service never spins down!
