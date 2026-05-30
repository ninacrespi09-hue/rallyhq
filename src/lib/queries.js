import { getDb } from "./db";
import { wellnessLevel, levelRank } from "./wellness";

/** Aggregate season stat totals + averages for one player. */
export function playerStatTotals(userId) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         COUNT(*) AS games,
         COALESCE(SUM(kills),0) AS kills,
         COALESCE(SUM(assists),0) AS assists,
         COALESCE(SUM(aces),0) AS aces,
         COALESCE(SUM(digs),0) AS digs,
         COALESCE(SUM(blocks),0) AS blocks,
         COALESCE(SUM(errors),0) AS errors
       FROM player_stats WHERE user_id = ?`
    )
    .get(userId);
  return row;
}

/** Team leaderboard for a given stat column. */
export function leaderboard(column, limit = 5) {
  const allowed = ["kills", "assists", "aces", "digs", "blocks"];
  if (!allowed.includes(column)) return [];
  const db = getDb();
  return db
    .prepare(
      `SELECT u.id, u.name, u.position, COALESCE(SUM(ps.${column}),0) AS total
       FROM users u LEFT JOIN player_stats ps ON ps.user_id = u.id
       WHERE u.role = 'player'
       GROUP BY u.id HAVING total > 0
       ORDER BY total DESC LIMIT ?`
    )
    .all(limit);
}

/** Team win/loss record. */
export function teamRecord() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
         SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN result='L' THEN 1 ELSE 0 END) AS losses
       FROM game_results`
    )
    .get();
  return { wins: row.wins || 0, losses: row.losses || 0 };
}

/** Upcoming events (today onward). */
export function upcomingEvents(limit = 10) {
  return getDb()
    .prepare(
      `SELECT * FROM events WHERE date(start_time) >= date('now')
       ORDER BY start_time ASC LIMIT ?`
    )
    .all(limit);
}

/** Today's check-in for a user, if any. */
export function todaysCheckin(userId) {
  return getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = date('now')")
    .get(userId);
}

/**
 * Each player's most recent post-game wellness submission, scored for attention.
 * Used by the coach dashboard summary.
 */
export function teamWellness() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT w.*, u.name, u.position, e.title AS event_title, e.start_time
       FROM post_game_checkins w
       JOIN users u ON u.id = w.user_id
       JOIN events e ON e.id = w.event_id
       WHERE w.id IN (
         SELECT MAX(id) FROM post_game_checkins GROUP BY user_id
       )
       ORDER BY u.name`
    )
    .all();

  const scored = rows
    .map((r) => ({ ...r, ...wellnessLevel(r) }))
    .sort((a, b) => levelRank(b.level) - levelRank(a.level));

  return {
    players: scored,
    needRest: scored.filter((s) => s.level === "rest"),
    monitor: scored.filter((s) => s.level === "monitor"),
  };
}

/** Most recent photos for the homepage preview. */
export function recentMedia(limit = 3) {
  return getDb()
    .prepare("SELECT id, url, caption FROM media ORDER BY created_at DESC, id DESC LIMIT ?")
    .all(limit);
}

export function allPlayers() {
  return getDb()
    .prepare("SELECT id, name, position, jersey_number FROM users WHERE role='player' ORDER BY name")
    .all();
}
