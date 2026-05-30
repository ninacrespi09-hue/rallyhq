# 🏐 RallyHQ — Volleyball Team Manager

A full-stack volleyball team management app built for a hackathon. Players track stats and daily wellness; coaches manage the schedule, results, attendance, and team comms — with **AI-powered check-in analysis** that surfaces injury risk and fatigue trends.

Built with **Next.js 15 (App Router) · React · Tailwind CSS · SQLite · Claude API**.

---

## Features

| Area | What it does |
|---|---|
| 🔐 **Auth & roles** | Email/password signup & login. Two roles: **coach** and **player**, with role-aware UI and protected APIs. |
| 📊 **Stat tracking** | Per-game kills, assists, aces, digs, blocks, errors. Season totals, category leaderboards, full roster table. |
| 🤝 **Collaborative scoring** | Any teammate can help record stats during a game. |
| 📅 **Schedule** | Practices, games, and tournaments. Coaches create events; everyone sees upcoming & past. |
| 🏆 **Results** | Record final scores; auto win/loss and season record. |
| ✅ **Daily check-ins** | 20-second soreness / energy / mood (1–5) + injury flags & sore-area tags. One per player per day. |
| 🤖 **AI insights** | Analyzes recent check-ins for rising soreness, low-energy streaks, mood dips, and injury risk. Uses **Claude** when an API key is set, with a deterministic rule-based fallback so the demo always works. |
| 📣 **Team communication** | Coaches post announcements, exercises, and info; pin important posts. |
| 👥 **Roster & profiles** | Player profiles with position (setter, libero, hitter…), jersey #, height, bio. |
| 🕒 **Attendance** | Per-event tracking (present / late / absent / excused). Coaches set anyone; players set themselves. |
| 📱 **Mobile-first** | Responsive with a bottom tab bar on mobile and a sidebar on desktop. |

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for real AI
npm run seed                 # load the demo team & data
npm run dev                  # http://localhost:3000
```

### Demo logins (password: `password123`)
- **Coach:** `coach@rallyhq.dev`
- **Player:** `maya@rallyhq.dev` (has a seeded rising-soreness trend the AI will flag)

> Tip: log in as the coach and open **AI insights → Generate** to see the analysis catch Maya's shoulder soreness, Ava's ankle injury, and Sofia's low energy.

## Environment

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables real Claude-powered check-in analysis. Without it, a built-in rule engine is used. |
| `AUTH_SECRET` | Secret for signing session JWTs. |

## Tech notes

- **DB:** SQLite via `better-sqlite3`, file at `data/rallyhq.db`, schema auto-created on first run (`src/lib/db.js`).
- **Auth:** bcrypt password hashing + signed JWT in an httpOnly cookie (`src/lib/auth.js`).
- **AI:** `src/lib/ai.js` — Claude (`claude-opus-4-8`) with rule-based fallback.
- **Routes:** UI pages in `src/app/*`, mutations in `src/app/api/*`.

## Project structure

```
src/
  app/            # pages + API routes (App Router)
  components/     # client components (forms, nav, panels)
  lib/            # db, auth, ai, queries, formatting
scripts/seed.mjs  # demo data
```
