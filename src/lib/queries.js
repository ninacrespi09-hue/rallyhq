import { getDb } from "./db";
import { wellnessLevel, levelRank } from "./wellness";

/** Aggregate season stat totals for one player. */
export function playerStatTotals(userId) {
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS games,
         COALESCE(SUM(kills),0) AS kills, COALESCE(SUM(hits),0) AS hits,
         COALESCE(SUM(assists),0) AS assists, COALESCE(SUM(aces),0) AS aces,
         COALESCE(SUM(digs),0) AS digs, COALESCE(SUM(blocks),0) AS blocks,
         COALESCE(SUM(errors),0) AS errors
       FROM player_stats WHERE user_id = ?`
    )
    .get(userId);
}

/** Team leaderboard for a given stat column — scoped to a team. */
export function leaderboard(column, limit = 5, teamId) {
  const allowed = ["kills", "assists", "aces", "digs", "blocks"];
  if (!allowed.includes(column)) return [];
  const db = getDb();
  const where = teamId ? "WHERE u.role = 'player' AND u.team_id = ?" : "WHERE u.role = 'player'";
  const args = teamId ? [limit, teamId] : [limit];
  return db
    .prepare(
      `SELECT u.id, u.name, u.position, COALESCE(SUM(ps.${column}),0) AS total
       FROM users u LEFT JOIN player_stats ps ON ps.user_id = u.id
       ${where} GROUP BY u.id HAVING total > 0
       ORDER BY total DESC LIMIT ?`
    )
    .all(teamId ? [teamId, limit] : [limit]);
}

/** Team win/loss record — scoped to a team. */
export function teamRecord(teamId) {
  const db = getDb();
  const row = teamId
    ? db.prepare(
        `SELECT SUM(CASE WHEN r.result='W' THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN r.result='L' THEN 1 ELSE 0 END) AS losses
         FROM game_results r JOIN events e ON e.id = r.event_id
         JOIN users u ON u.id = e.created_by WHERE u.team_id = ?`
      ).get(teamId)
    : db.prepare(
        `SELECT SUM(CASE WHEN result='W' THEN 1 ELSE 0 END) AS wins,
                SUM(CASE WHEN result='L' THEN 1 ELSE 0 END) AS losses FROM game_results`
      ).get();
  return { wins: row?.wins || 0, losses: row?.losses || 0 };
}

/** Upcoming events scoped to a team. */
export function upcomingEvents(limit = 10, teamId) {
  if (!teamId) {
    return getDb()
      .prepare("SELECT * FROM events WHERE date(start_time) >= date('now') ORDER BY start_time ASC LIMIT ?")
      .all(limit);
  }
  return getDb()
    .prepare(
      `SELECT e.* FROM events e JOIN users u ON u.id = e.created_by
       WHERE u.team_id = ? AND date(e.start_time) >= date('now')
       ORDER BY e.start_time ASC LIMIT ?`
    )
    .all(teamId, limit);
}

/** Today's check-in for a user, if any. */
export function todaysCheckin(userId) {
  return getDb()
    .prepare("SELECT * FROM checkins WHERE user_id = ? AND date = date('now')")
    .get(userId);
}

/** Post-game wellness, scoped to a team. */
export function teamWellness(teamId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT w.*, u.name, u.position, e.title AS event_title, e.start_time
       FROM post_game_checkins w
       JOIN users u ON u.id = w.user_id
       JOIN events e ON e.id = w.event_id
       WHERE w.id IN (SELECT MAX(id) FROM post_game_checkins GROUP BY user_id)
       ${teamId ? "AND u.team_id = ?" : ""}
       ORDER BY u.name`
    )
    .all(...(teamId ? [teamId] : []));

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

/** All players on a team. */
export function allPlayers(teamId) {
  if (!teamId) {
    return getDb()
      .prepare("SELECT id, name, position, jersey_number FROM users WHERE role='player' ORDER BY name")
      .all();
  }
  return getDb()
    .prepare("SELECT id, name, position, jersey_number FROM users WHERE role='player' AND team_id = ? ORDER BY name")
    .all(teamId);
}
