# 🏐 RallyHQ — Volleyball Team Manager

A full-stack volleyball team management app. Players track stats and daily wellness; coaches manage the schedule, results, attendance, and team comms — with **AI-powered check-in analysis** that surfaces injury risk and fatigue trends.

Built with **Next.js 15 (App Router) · React · shadcn/ui · TanStack Query/Table · Tailwind CSS · SQLite · Claude API**.

---

## Workflow

**We work directly on `main`.** No feature branches unless explicitly needed for a large isolated experiment. Commit and push to `main` regularly.

---

## Features

| Area | What it does |
|---|---|
| 🔐 **Auth & roles** | Email/password signup & login. Roles: **coach**, **player**, and **parent**, with role-aware UI and protected APIs. |
| 📊 **Stat tracking** | Per-game kills, assists, aces, digs, blocks, errors. Season totals, category leaderboards, full roster table. |
| 🤝 **Collaborative scoring** | Any teammate can help record stats during a game. |
| 📅 **Schedule** | Practices, games, and tournaments. Coaches create events; everyone sees upcoming & past. |
| 🏆 **Results** | Record final scores; auto win/loss and season record. |
| ✅ **Daily check-ins** | 20-second soreness / energy / mood (1–5) + injury flags & sore-area tags. One per player per day. |
| 🤖 **AI insights** | Analyzes recent check-ins for rising soreness, low-energy streaks, mood dips, and injury risk. Uses **Claude** when an API key is set, with a deterministic rule-based fallback. |
| 📣 **Team communication** | Group chat, announcements, exercises, and info. |
| 👥 **Roster & profiles** | Player profiles with position, jersey #, height, bio. |
| 🕒 **Attendance & RSVP** | Per-event tracking and RSVP for games and practices. |
| 📱 **Mobile-first** | Responsive with a bottom tab bar on mobile and a sidebar on desktop. |

## 🎨 Design Philosophy

RallyHQ treats visual design as part of athlete care, not decoration. The UI uses **shadcn/ui** primitives with RallyHQ's blue/navy baby-blue theme tokens so the design system stays consistent and maintainable.

### Color psychology: two registers of blue

- **Calming blues for wellness** — softer sky/cyan tones for check-ins and recovery surfaces.
- **Energetic blues for performance** — deeper blues and indigo for stats, leaderboards, and exercises.
- **Purposeful accent colors** — schedule event tags and wellness attention states (green/amber/red).

### Organized layouts

- Baby-blue canvas background, consistent `PageHeader`, card-based content rhythm.
- Progressive disclosure: roster shows essentials; full stats live on player profiles.
- Plain language, full stat names (Kills, Blocks, Digs, etc.).

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

## Environment

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables real Claude-powered check-in analysis. Without it, a built-in rule engine is used. |
| `AUTH_SECRET` | Secret for signing session JWTs. |

## Tech notes

- **UI:** shadcn/ui components in `src/components/ui/`, TanStack Query for client data, TanStack Table for data tables.
- **DB:** SQLite via `better-sqlite3`, file at `data/rallyhq.db`.
- **Auth:** bcrypt password hashing + signed JWT in an httpOnly cookie.
- **AI:** `src/lib/ai.js` — Claude with rule-based fallback.

## Project structure

```
src/
  app/            # pages + API routes (App Router)
  components/     # client components + ui/ (shadcn)
  hooks/          # TanStack Query helpers
  lib/            # db, auth, ai, queries, formatting
scripts/seed.mjs  # demo data
```
