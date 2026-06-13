import { getDb } from "./db";
import { isSportId } from "./sports";

export const SPORT_COOKIE = "rallyhq_sport";

/** Teams a user can access per sport (for multi-sport schedule + hubs). */
export function getUserSportTeams(userId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ust.sport, ust.team_id, t.name AS team_name, t.code AS team_code
       FROM user_sport_teams ust
       JOIN teams t ON t.id = ust.team_id
       WHERE ust.user_id = ?
       ORDER BY ust.sport`
    )
    .all(userId);
  return rows;
}

export function getTeamIdForSport(userId, sport) {
  if (!isSportId(sport)) return null;
  const row = getDb()
    .prepare("SELECT team_id FROM user_sport_teams WHERE user_id = ? AND sport = ?")
    .get(userId, sport);
  return row?.team_id ?? null;
}

/** Ensure user has a sport team row (from primary team on first access). */
export function ensureUserSportTeam(userId, sport, teamId) {
  if (!teamId) return;
  getDb()
    .prepare(
      `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, ?, ?)
       ON CONFLICT(user_id, sport) DO NOTHING`
    )
    .run(userId, sport, teamId);
}

/** Resolve which team_id to use for a sport-specific page. */
export function resolveTeamId(user, sport) {
  const sportTeam = getTeamIdForSport(user.id, sport);
  if (sportTeam) return sportTeam;
  if (user.team_sport === sport) return user.team_id;
  return null;
}

/** All team ids the user can see across sports. */
export function allTeamIdsForUser(userId) {
  return getUserSportTeams(userId).map((r) => r.team_id);
}
