# 🎮 PlaySphere - Modern Multiplayer Gaming & Friends Hangout Hub

PlaySphere is a real-time web-based multiplayer gaming and social platform where friends can create private rooms, play multiplayer games, chat together, and enjoy synchronized music/watch parties.

---

## ✨ Features

- 🎲 **Multiplayer Ludo (2–6 Players)**: Original board, server-authoritative dice rolling, safe zones, opponent token captures, bonus 6-rolls, and victory podiums with confetti.
- 🐍 **Snakes & Ladders (2–4 Players)**: 100-tile animated board with golden ladders, snake slides, sound effects, and rematch loops.
- 🎵 **Music & Watch Lounge**: Shared YouTube video/music player with synchronized playback, collaborative queue, and presets.
- 💬 **Real-Time Chat**: In-game room chat with typing indicators and emojis + floating 1-on-1 direct messaging drawer.
- 🤝 **Friends & Social Hub**: Real-time presence (Online, In-Game, In-Music), live user search, friend requests, and 1-click room invites.
- 📱 **WhatsApp One-Click Invite**: Pre-formatted invite generator (`https://api.whatsapp.com/send?text=...`).
- 🛡️ **Admin Panel**: Platform analytics, user moderation, role management, and active room monitoring.
- 🔊 **Web Audio Synthesizer**: Pure browser audio synthesis for dice rolls, token hops, captures, and victory fanfares (zero external audio files required).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend Server**: Node.js, Express, Socket.IO (WebSockets), JWT, Bcrypt.
- **Database**: PostgreSQL on Supabase + Better-SQLite3 local fallback.

---

## 🚀 Quick Start (Local)

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```
*Runs on `http://localhost:5000`.*

### 2. Frontend Client
```bash
cd client
npm install
npm run dev
```
*Runs on `http://localhost:5173`.*

---

## 🌐 Deployment

- **Frontend**: Deploy `client` folder to **Vercel** or **Cloudflare Pages**.
- **Backend**: Deploy `server` folder to **Koyeb**, **Fly.io**, **Render**, or a VPS.
- **Instant Zero-Lag Cloudflare Tunnel**:
  ```bash
  cloudflared tunnel --url http://localhost:5173
  ```
