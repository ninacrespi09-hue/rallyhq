import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

let db;

/**
 * Returns a singleton SQLite connection and ensures the schema exists.
 * The DB file lives in /data so it persists across restarts.
 */
export function getDb() {
  if (db) return db;

  const dataDir =
    process.env.DB_PATH ||
    (fs.existsSync("/var/data") ? "/var/data" : path.join(process.cwd(), "data"));
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, "rallyhq.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      code       TEXT NOT NULL UNIQUE,   -- 6-char join code players use
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      team_id       INTEGER REFERENCES teams(id),
      role          TEXT NOT NULL DEFAULT 'player', -- 'coach' | 'player'
      position      TEXT,                            -- setter, libero, outside hitter, etc.
      jersey_number INTEGER,
      height_cm     INTEGER,
      bio           TEXT,
      photo_url     TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL,            -- 'practice' | 'game' | 'tournament'
      title       TEXT NOT NULL,
      opponent    TEXT,
      location    TEXT,
      start_time  TEXT NOT NULL,            -- ISO datetime
      end_time    TEXT,
      notes       TEXT,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id  INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status    TEXT NOT NULL DEFAULT 'present', -- present | late | absent | excused
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id   INTEGER NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
      our_score  INTEGER NOT NULL DEFAULT 0,   -- sets won
      opp_score  INTEGER NOT NULL DEFAULT 0,   -- sets lost
      result     TEXT NOT NULL DEFAULT 'W',    -- W | L
      sets_json  TEXT                          -- JSON array of "25-20" style set scores
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recorded_by INTEGER REFERENCES users(id),
      kills       INTEGER NOT NULL DEFAULT 0,
      hits        INTEGER NOT NULL DEFAULT 0,
      assists     INTEGER NOT NULL DEFAULT 0,
      aces        INTEGER NOT NULL DEFAULT 0,
      digs        INTEGER NOT NULL DEFAULT 0,
      blocks      INTEGER NOT NULL DEFAULT 0,
      errors      INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date         TEXT NOT NULL,            -- YYYY-MM-DD
      soreness     INTEGER NOT NULL,         -- 1 (none) .. 5 (severe)
      energy       INTEGER NOT NULL,         -- 1 (drained) .. 5 (great)
      mood         INTEGER NOT NULL,         -- 1 (low) .. 5 (great)
      injury       INTEGER NOT NULL DEFAULT 0, -- 0/1 flag
      sore_areas   TEXT,                     -- comma list e.g. "shoulder,knee"
      note         TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS post_game_checkins (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      soreness       INTEGER NOT NULL,         -- 1 (none) .. 5 (severe)
      energy         INTEGER NOT NULL,         -- 1 (drained) .. 5 (great)
      mood           INTEGER NOT NULL,         -- 1 (low) .. 5 (great)
      recovery       INTEGER NOT NULL,         -- 1 (fully recovered) .. 5 (needs lots of recovery)
      injury         INTEGER NOT NULL DEFAULT 0,
      sore_areas     TEXT,                     -- comma list e.g. "shoulder,knee"
      recovery_needs TEXT,                     -- comma list e.g. "Ice,Rest,Physio"
      note           TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id  INTEGER NOT NULL REFERENCES users(id),
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'announcement', -- announcement | exercise | info
      pinned     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      url            TEXT NOT NULL,
      caption        TEXT,
      event_id       INTEGER REFERENCES events(id) ON DELETE SET NULL, -- album by event
      category       TEXT NOT NULL DEFAULT 'general',  -- 'team' | 'highlight' | 'general'
      tagged_players TEXT,                              -- comma list of player names (for search)
      favorite       INTEGER NOT NULL DEFAULT 0,
      uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploader_role  TEXT,                              -- 'coach' | 'player'
      ratio          REAL NOT NULL DEFAULT 1,           -- height/width hint for masonry
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media_likes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id  INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(media_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      instructions TEXT,
      reps         TEXT,                              -- e.g. "30 reps", "3 x 10"
      difficulty   TEXT NOT NULL DEFAULT 'Beginner',  -- Beginner | Intermediate | Advanced
      category     TEXT NOT NULL DEFAULT 'Skills',    -- Skills | Strength | Conditioning | Recovery | Injury Prevention
      coach_notes  TEXT,
      created_by   INTEGER REFERENCES users(id),
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercise_completions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id  INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(exercise_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS player_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_id  INTEGER REFERENCES users(id),
      note       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      scope        TEXT NOT NULL,            -- 'team' | 'player'
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      summary      TEXT NOT NULL,
      details_json TEXT,
      source       TEXT NOT NULL DEFAULT 'rules', -- 'claude' | 'rules'
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ---- lightweight migrations for databases created before these columns existed ----
  const has = (table, col) =>
    db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
  if (!has("player_stats", "hits")) {
    db.exec("ALTER TABLE player_stats ADD COLUMN hits INTEGER NOT NULL DEFAULT 0");
  }
  if (!has("users", "photo_url")) {
    db.exec("ALTER TABLE users ADD COLUMN photo_url TEXT");
  }
  if (!has("users", "team_id")) {
    db.exec("ALTER TABLE users ADD COLUMN team_id INTEGER REFERENCES teams(id)");
  }
  if (!has("player_stats", "service_receptions")) {
    db.exec("ALTER TABLE player_stats ADD COLUMN service_receptions INTEGER NOT NULL DEFAULT 0");
  }
  // Events, announcements, exercises, media are scoped through their creator's team_id via JOIN.
}
