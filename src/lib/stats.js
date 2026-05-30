import { getDb } from "./db";
import { STATS } from "./statDefs";

// Re-export so server modules can keep importing STATS from "@/lib/stats".
export { STATS };

const SUMS = STATS.map((s) => `COALESCE(SUM(ps.${s.key}),0) AS ${s.key}`).join(", ");

/** Season totals for one player across the 5 tracked statistics. */
export function statTotals(userId) {
  return getDb()
    .prepare(
      `SELECT COUNT(ps.id) AS games, ${SUMS}
       FROM player_stats ps WHERE ps.user_id = ?`
    )
    .get(userId);
}

/** Every player with season totals — optionally scoped to a team. */
export function teamLeaderboard(teamId) {
  const where = teamId ? "WHERE u.role = 'player' AND u.team_id = ?" : "WHERE u.role = 'player'";
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.position, u.jersey_number, u.photo_url,
              COUNT(ps.id) AS games, ${SUMS}
       FROM users u LEFT JOIN player_stats ps ON ps.user_id = u.id
       ${where} GROUP BY u.id ORDER BY u.name`
    )
    .all(...(teamId ? [teamId] : []));
}

/** Attendance percentage (present or late counts as attended). */
export function attendancePct(userId) {
  const r = getDb()
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) AS attended
       FROM attendance WHERE user_id = ?`
    )
    .get(userId);
  if (!r.total) return null;
  return Math.round((r.attended / r.total) * 100);
}

/** A 0–100 wellness score from recent daily + post-game check-ins. */
export function wellnessScore(userId) {
  const db = getDb();
  const daily = db
    .prepare("SELECT soreness, energy, mood, injury FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 7")
    .all(userId);
  const post = db
    .prepare("SELECT soreness, energy, mood, recovery, injury FROM post_game_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 5")
    .all(userId);

  const rows = [...daily, ...post];
  if (rows.length === 0) return null;

  let total = 0;
  let injuryFlag = false;
  for (const r of rows) {
    const parts = [r.energy / 5, (6 - r.soreness) / 5, r.mood / 5];
    if (r.recovery != null) parts.push((6 - r.recovery) / 5);
    total += parts.reduce((a, b) => a + b, 0) / parts.length;
    if (r.injury) injuryFlag = true;
  }
  let score = Math.round((total / rows.length) * 100);
  if (injuryFlag) score -= 12;
  return Math.max(0, Math.min(100, score));
}

/** Most recent games with this player's stat line. */
export function recentGames(userId, limit = 6) {
  return getDb()
    .prepare(
      `SELECT ps.*, e.title, e.opponent, e.type, e.start_time
       FROM player_stats ps JOIN events e ON e.id = ps.event_id
       WHERE ps.user_id = ? ORDER BY e.start_time DESC LIMIT ?`
    )
    .all(userId, limit);
}

/** Recent daily check-ins for the wellness history list/chart. */
export function wellnessHistory(userId, limit = 10) {
  return getDb()
    .prepare("SELECT date, soreness, energy, mood, injury, note FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT ?")
    .all(userId, limit);
}

/** Injury reports drawn from daily and post-game check-ins. */
export function injuryHistory(userId) {
  const db = getDb();
  const daily = db
    .prepare("SELECT date, sore_areas, note FROM checkins WHERE user_id = ? AND injury = 1 ORDER BY date DESC")
    .all(userId)
    .map((r) => ({ date: r.date, areas: r.sore_areas, note: r.note, source: "Daily check-in" }));
  const post = db
    .prepare(
      `SELECT e.start_time AS date, w.sore_areas, w.note, e.title
       FROM post_game_checkins w JOIN events e ON e.id = w.event_id
       WHERE w.user_id = ? AND w.injury = 1 ORDER BY e.start_time DESC`
    )
    .all(userId)
    .map((r) => ({ date: r.date?.slice(0, 10), areas: r.sore_areas, note: r.note, source: r.title }));
  return [...daily, ...post].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** Heuristic strengths + areas for improvement from stat profile vs. team. */
export function strengthsAndImprovements(userId) {
  const board = teamLeaderboard();
  const me = board.find((p) => p.id === userId);
  if (!me || me.games === 0) {
    return { strengths: ["Building a baseline — keep logging games."], improvements: ["Play more games to unlock insights."] };
  }

  // Team per-game average for each stat.
  const teamAvg = {};
  for (const s of STATS) {
    const totalGames = board.reduce((a, p) => a + p.games, 0) || 1;
    const totalStat = board.reduce((a, p) => a + p[s.key], 0);
    teamAvg[s.key] = totalStat / totalGames;
  }

  const ranked = STATS.map((s) => {
    const perGame = me[s.key] / me.games;
    const avg = teamAvg[s.key] || 0.0001;
    return { label: s.label, ratio: perGame / (avg || 0.0001), perGame };
  }).sort((a, b) => b.ratio - a.ratio);

  const strengths = ranked
    .filter((r) => r.ratio >= 1)
    .slice(0, 2)
    .map((r) => `${r.label} — ${r.perGame.toFixed(1)} per game, above team average`);
  const improvements = ranked
    .filter((r) => r.ratio < 1)
    .slice(-2)
    .map((r) => `${r.label} — ${r.perGame.toFixed(1)} per game, room to grow`);

  if (strengths.length === 0) strengths.push(`${ranked[0].label} is your top category`);
  if (improvements.length === 0) improvements.push("Well-rounded — keep sharpening every skill");
  return { strengths, improvements };
}

/* ------------------------------ Team analytics ------------------------------ */

export function teamStatTotals() {
  return getDb()
    .prepare(`SELECT ${SUMS} FROM player_stats ps`)
    .get();
}

/** Per-game offensive output (kills + aces + blocks) over time, plus W/L. */
export function teamTrends() {
  const db = getDb();
  const games = db
    .prepare(
      `SELECT e.id, e.title, e.opponent, e.start_time, r.result, r.our_score, r.opp_score
       FROM events e JOIN game_results r ON r.event_id = e.id
       ORDER BY e.start_time ASC`
    )
    .all();

  return games.map((g) => {
    const agg = db
      .prepare("SELECT COALESCE(SUM(kills+aces+blocks),0) AS pts FROM player_stats WHERE event_id = ?")
      .get(g.id);
    return {
      label: (g.opponent || g.title || "").slice(0, 10),
      points: agg.pts,
      result: g.result,
      score: `${g.our_score}-${g.opp_score}`,
    };
  });
}
