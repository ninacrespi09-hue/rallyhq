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

## 🎨 Design Philosophy

RallyHQ treats visual design as part of athlete care, not decoration. Every
color, layout, and interaction is chosen to **lower stress, sharpen
communication, and support performance** — because a tired or anxious athlete
reads a cluttered, alarming interface very differently than a calm one.

### Color psychology: two registers of blue

The whole app lives in blue — a hue associated with trust, focus, and calm —
but it works in two deliberate registers:

- **Calming blues for wellness.** Recovery is about *down-regulation*, so
  wellness surfaces use softer, cooler tones — sky and cyan, lots of white
  space, gentle gradients. The **Wellness Check** card (`sky-500 → cyan-600`),
  the daily and post-game check-ins, and the **AI insights** view are
  intentionally quiet and unhurried so a sore or low-energy player feels
  supported rather than judged. Wellness states are shown with calm, legible
  cues (a soft progress ring, a single summary line) instead of loud alarms.
- **Energetic blues for performance.** Competitive surfaces use deeper, more
  saturated blues and indigo to signal drive and momentum. **Team Stats**
  (`blue-500 → indigo-600`), the sortable **leaderboard**, player performance
  trends, and **Recommended Exercises** (`blue-600 → navy-900`) lean into vivid
  gradients, bold numerals, and charts that make progress feel earned.
- **Purposeful accent colors.** Color is used as information, never noise:
  schedule events are tag-coded (🔵 practice, 🟡 tournament, 🟢 team bonding),
  and wellness attention is staged (green = good, amber = monitor, red = needs
  rest) so a coach can triage a roster at a glance.

### Organized layouts that reduce cognitive load

Stress often comes from *not knowing where to look*. The layout system is built
to remove that friction:

- **A calm canvas.** A baby-blue background with a soft top sheen keeps every
  screen low-glare and consistent, so the app feels like one calm place.
- **A predictable rhythm.** Every page opens with the same `PageHeader`
  (eyebrow → title → one-line subtitle), and content sits in a consistent card
  system with generous spacing and a clear type hierarchy. Fluent users build
  *earned familiarity* — they always know where things are.
- **Progressive disclosure.** The roster shows only what's needed to recognize a
  teammate (photo, name, number, position); the full stat lines, charts, wellness
  history, and coach notes live one tap deeper on the player profile. The home
  hub surfaces a single role-aware "for you" action above the navigation grid so
  the most important next step is obvious.
- **Plain language, full names.** Statistics are spelled out (Kills, Blocks,
  Digs, Serve Aces, Hits) rather than abbreviated, and copy avoids hype so
  information stays scannable and trustworthy.

### Restraint as a feature

The interface is deliberately *quiet*: tinted ink instead of pure black, soft
shadows instead of heavy borders, motion limited to gentle entrance and hover
cues, and accessible focus rings throughout. Calm, organized, and legible is the
point — the design gets out of the way so athletes and coaches can focus on the
team.

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
