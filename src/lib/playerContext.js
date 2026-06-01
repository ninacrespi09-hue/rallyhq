import { getDb } from "./db";
import {
  statTotals,
  attendancePct,
  wellnessScore,
  wellnessHistory,
  recentGames,
  strengthsAndImprovements,
} from "./stats";
import { STATS } from "./statDefs";

/** Pull everything the AI uses for one player on a team. */
export function gatherPlayerContext(playerId, teamId) {
  const db = getDb();
  const player = db
    .prepare(
      `SELECT id, name, position, jersey_number FROM users
       WHERE id = ? AND team_id = ? AND role = 'player'`
    )
    .get(playerId, teamId);
  if (!player) return null;

  const totals = statTotals(playerId);
  const { strengths, improvements } = strengthsAndImprovements(playerId, teamId);
  const perGame = STATS.map((s) => ({
    label: s.label,
    total: totals[s.key] || 0,
    perGame: totals.games ? (totals[s.key] / totals.games).toFixed(1) : "0",
  }));

  const checkins = wellnessHistory(playerId, 14);
  const games = recentGames(playerId, 5);
  const exerciseDone = db
    .prepare("SELECT COUNT(*) AS c FROM exercise_completions WHERE user_id = ?")
    .get(playerId).c;
  const topExercises = db
    .prepare(
      `SELECT e.title, COUNT(*) AS times FROM exercise_completions ec
       JOIN exercises e ON e.id = ec.exercise_id
       WHERE ec.user_id = ? GROUP BY e.id ORDER BY times DESC LIMIT 4`
    )
    .all(playerId);
  const checkinStreak = db
    .prepare(
      `SELECT COUNT(*) AS c FROM checkins WHERE user_id = ? AND date >= date('now', '-30 days')`
    )
    .get(playerId).c;

  return {
    player,
    totals,
    perGame,
    strengths,
    improvements,
    attendance: attendancePct(playerId),
    wellness: wellnessScore(playerId),
    checkins,
    games,
    exerciseDone,
    topExercises,
    checkinStreak,
  };
}

/** All players on a team — for coach-wide AI analysis. */
export function gatherTeamPlayerContexts(teamId) {
  const db = getDb();
  const ids = db
    .prepare("SELECT id FROM users WHERE team_id = ? AND role = 'player' ORDER BY name")
    .all(teamId)
    .map((r) => r.id);
  return ids.map((id) => gatherPlayerContext(id, teamId)).filter(Boolean);
}
