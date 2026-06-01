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

/** Everything the AI coach can see about one player in the app. */
export function buildPlayerCoachProfile(userId, teamId) {
  const db = getDb();
  const player = db
    .prepare(
      `SELECT id, name, position, jersey_number, bio FROM users WHERE id = ? AND role = 'player'`
    )
    .get(userId);
  if (!player) return null;

  const totals = statTotals(userId);
  const attendance = attendancePct(userId);
  const wellness = wellnessScore(userId);
  const wHistory = wellnessHistory(userId, 7);
  const games = recentGames(userId, 6);
  const { strengths, improvements } = strengthsAndImprovements(userId, teamId);

  const checkins = db
    .prepare(
      `SELECT date, soreness, energy, mood, injury, sore_areas, note
       FROM checkins WHERE user_id = ? AND date >= date('now', '-21 days')
       ORDER BY date DESC LIMIT 21`
    )
    .all(userId);

  const postGame = db
    .prepare(
      `SELECT e.title, e.start_time, w.soreness, w.energy, w.mood, w.recovery, w.injury, w.note
       FROM post_game_checkins w JOIN events e ON e.id = w.event_id
       WHERE w.user_id = ? ORDER BY e.start_time DESC LIMIT 5`
    )
    .all(userId);

  const exercisesDone = db
    .prepare(
      `SELECT COUNT(*) AS c FROM exercise_completions ec
       JOIN exercises ex ON ex.id = ec.exercise_id
       JOIN users u ON u.id = ex.created_by
       WHERE ec.user_id = ? AND u.team_id = ?`
    )
    .get(userId, teamId)?.c ?? 0;

  const exercisesTotal = db
    .prepare(
      `SELECT COUNT(*) AS c FROM exercises ex JOIN users u ON u.id = ex.created_by WHERE u.team_id = ?`
    )
    .get(teamId)?.c ?? 0;

  const teamExercises = db
    .prepare(
      `SELECT e.id, e.title, e.reps, e.category, e.difficulty,
              EXISTS(
                SELECT 1 FROM exercise_completions ec
                WHERE ec.exercise_id = e.id AND ec.user_id = ?
              ) AS completed
       FROM exercises e JOIN users u ON u.id = e.created_by
       WHERE u.team_id = ?
       ORDER BY e.title`
    )
    .all(userId, teamId)
    .map((e) => ({ ...e, completed: !!e.completed }));

  const perGame = {};
  for (const s of STATS) {
    perGame[s.key] = totals.games ? (totals[s.key] / totals.games).toFixed(2) : "0";
  }

  return {
    id: player.id,
    name: player.name,
    position: player.position,
    jersey_number: player.jersey_number,
    bio: player.bio,
    gamesPlayed: totals.games,
    statTotals: STATS.reduce((o, s) => ({ ...o, [s.label]: totals[s.key] }), {}),
    perGameStats: STATS.reduce((o, s) => ({ ...o, [s.label]: perGame[s.key] }), {}),
    attendancePct: attendance,
    wellnessScore: wellness,
    wellnessHistory: wHistory,
    recentCheckins: checkins,
    postGameWellness: postGame,
    exercisesCompleted: exercisesDone,
    exercisesAvailable: exercisesTotal,
    teamExercises,
    computedStrengths: strengths,
    computedImprovements: improvements,
    recentGames: games.map((g) => ({
      title: g.title,
      opponent: g.opponent,
      date: g.start_time?.slice(0, 10),
      kills: g.kills,
      digs: g.digs,
      aces: g.aces,
      blocks: g.blocks,
      errors: g.errors,
    })),
  };
}

/** All players on a team for coach roster view. */
export function teamPlayerIds(teamId) {
  return getDb()
    .prepare(`SELECT id, name, position, jersey_number FROM users WHERE team_id = ? AND role = 'player' ORDER BY name`)
    .all(teamId);
}
