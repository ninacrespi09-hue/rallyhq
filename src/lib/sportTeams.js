import { getDb } from "./db";
import { isSportId } from "./sports";

export const SPORT_COOKIE = "rallyhq_sport";

/** Default demo teams with example players and stats. */
export const DEMO_TEAM_CODES = {
  volleyball: "DEMO01",
  basketball: "BBALL01",
  soccer: "SOC01",
};

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

export function getDemoTeamId(sport) {
  if (!isSportId(sport)) return null;
  const code = DEMO_TEAM_CODES[sport];
  const row = getDb().prepare("SELECT id FROM teams WHERE code = ?").get(code);
  return row?.id ?? null;
}

export function getTeamIdForSport(userId, sport) {
  if (!isSportId(sport)) return null;
  const row = getDb()
    .prepare("SELECT team_id FROM user_sport_teams WHERE user_id = ? AND sport = ?")
    .get(userId, sport);
  return row?.team_id ?? null;
}

function playerCountForTeam(teamId) {
  if (!teamId) return 0;
  return getDb()
    .prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'player' AND team_id = ?")
    .get(teamId).c;
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
  if (!user || !isSportId(sport)) return null;

  const linked = getTeamIdForSport(user.id, sport);
  if (linked && playerCountForTeam(linked) > 0) return linked;

  // All-sports coaches explore demo rosters until they add their own players.
  if (user.sport_preference === "all" && user.role === "coach") {
    const demo = getDemoTeamId(sport);
    if (demo && playerCountForTeam(demo) > 0) return demo;
  }

  if (linked) return linked;
  if (user.team_sport === sport) return user.team_id;
  return null;
}

/** All team ids the user can see across sports. */
export function allTeamIdsForUser(userId) {
  return getUserSportTeams(userId).map((r) => r.team_id);
}
