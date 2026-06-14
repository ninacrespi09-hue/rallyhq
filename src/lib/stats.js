import { getDb } from "./db";
import { STATS } from "./statDefs";
import { getStatsForSport, getSportConfig } from "./sports";
import { buildStatSumSelect } from "./statAgg";
import { eventTeamExpr } from "./teamScope";

// Re-export so server modules can keep importing STATS from "@/lib/stats".
export { STATS };

function sumSelect(sport = "volleyball") {
  return buildStatSumSelect(getStatsForSport(sport));
}

/** Season totals for one player across tracked statistics. */
export function statTotals(userId, teamId = null, sport = "volleyball") {
  const sums = sumSelect(sport);
  if (teamId) {
    return getDb()
      .prepare(
        `SELECT ${sums}
         FROM player_stats ps
         JOIN events e ON e.id = ps.event_id AND e.team_id = ?
         WHERE ps.user_id = ?`
      )
      .get(teamId, userId);
  }
  return getDb()
    .prepare(`SELECT ${sums} FROM player_stats ps WHERE ps.user_id = ?`)
    .get(userId);
}

/** Every player with season totals — scoped to a team (empty if no team). */
export function teamLeaderboard(teamId, sport = "volleyball") {
  if (!teamId) return [];
  const sums = sumSelect(sport);
  return getDb()
    .prepare(
      `SELECT u.id, u.name, u.position, u.jersey_number, u.photo_url,
              ${sums}
       FROM users u
       LEFT JOIN player_stats ps ON ps.user_id = u.id
       LEFT JOIN events e ON e.id = ps.event_id AND e.team_id = ?
       WHERE u.role = 'player' AND u.team_id = ?
         AND (ps.id IS NULL OR e.id IS NOT NULL)
       GROUP BY u.id ORDER BY u.name`
    )
    .all(teamId, teamId);
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
export function recentGames(userId, limit = 6, teamId = null) {
  if (teamId) {
    return getDb()
      .prepare(
        `SELECT ps.*, e.title, e.opponent, e.type, e.start_time
         FROM player_stats ps JOIN events e ON e.id = ps.event_id
         WHERE ps.user_id = ? AND e.team_id = ?
         ORDER BY e.start_time DESC LIMIT ?`
      )
      .all(userId, teamId, limit);
  }
  return getDb()
    .prepare(
      `SELECT ps.*, e.title, e.opponent, e.type, e.start_time
       FROM player_stats ps JOIN events e ON e.id = ps.event_id
       WHERE ps.user_id = ? ORDER BY e.start_time DESC LIMIT ?`
    )
    .all(userId, limit);
}

/** Per-game values for one stat column (e.g. Points, Goals, Kills). */
export function statTrend(userId, statKey = "kills", limit = 8, gamesIn, teamId = null) {
  const games = gamesIn ?? recentGames(userId, limit, teamId);
  if (games.length > 0) {
    return [...games].reverse().map((g) => ({
      label: g.opponent || g.title || "Game",
      value: Number(g[statKey]) || 0,
    }));
  }
  const totals = statTotals(userId, teamId);
  if ((totals[statKey] ?? 0) > 0 || totals.games > 0) {
    return [{ label: "Season", value: Number(totals[statKey]) || 0 }];
  }
  return [];
}

/** @deprecated Use statTrend(userId, "kills", ...) */
export function killsTrend(userId, limit = 8, gamesIn) {
  return statTrend(userId, "kills", limit, gamesIn);
}

/** Recent daily check-ins for the wellness history list/chart. */
export function wellnessHistory(userId, limit = 10) {
  return getDb()
    .prepare("SELECT date, soreness, energy, mood, injury, note FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT ?")
    .all(userId, limit);
}

/** Injury reports drawn from daily and post-game check-ins. */
export function injuryHistory(userId, limit = 12) {
  const db = getDb();
  const daily = db
    .prepare("SELECT date, sore_areas, note FROM checkins WHERE user_id = ? AND injury = 1 ORDER BY date DESC LIMIT ?")
    .all(userId, limit)
    .map((r) => ({ date: r.date, areas: r.sore_areas, note: r.note, source: "Daily check-in" }));
  const post = db
    .prepare(
      `SELECT e.start_time AS date, w.sore_areas, w.note, e.title
       FROM post_game_checkins w JOIN events e ON e.id = w.event_id
       WHERE w.user_id = ? AND w.injury = 1 ORDER BY e.start_time DESC LIMIT ?`
    )
    .all(userId, limit)
    .map((r) => ({ date: r.date?.slice(0, 10), areas: r.sore_areas, note: r.note, source: r.title }));
  return [...daily, ...post].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** Heuristic strengths + areas for improvement from stat profile vs. team. */
export function strengthsAndImprovements(userId, teamId, statDefs = STATS, sport = "volleyball") {
  const board = teamLeaderboard(teamId, sport);
  const me = board.find((p) => p.id === userId);
  if (!me || me.games === 0) {
    return { strengths: ["Building a baseline — keep logging games."], improvements: ["Play more games to unlock insights."] };
  }

  const editable = statDefs.filter((s) => s.agg !== "computed");
  const teamAvg = {};
  for (const s of editable) {
    const totalGames = board.reduce((a, p) => a + p.games, 0) || 1;
    const totalStat = board.reduce((a, p) => a + (p[s.key] || 0), 0);
    teamAvg[s.key] = totalStat / totalGames;
  }

  const ranked = editable
    .map((s) => {
      const perGame = me[s.key] / me.games;
      const avg = teamAvg[s.key] || 0.0001;
      return { label: s.label, ratio: perGame / (avg || 0.0001), perGame };
    })
    .sort((a, b) => b.ratio - a.ratio);

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

export function teamStatTotals(teamId, sport = "volleyball") {
  const sums = sumSelect(sport);
  if (!teamId) {
    return getDb().prepare(`SELECT ${sums} FROM player_stats ps`).get();
  }
  return getDb()
    .prepare(
      `SELECT ${sums} FROM player_stats ps
       JOIN users u ON u.id = ps.user_id WHERE u.team_id = ?`
    )
    .get(teamId);
}

/** Per-game team output over time, plus W/L. */
export function teamTrends(teamId, sport = "volleyball") {
  const db = getDb();
  const { trendMetric } = getSportConfig(sport);
  const games = teamId
    ? db
        .prepare(
          `SELECT e.id, e.title, e.opponent, e.start_time, r.result, r.our_score, r.opp_score
           FROM events e JOIN game_results r ON r.event_id = e.id
           WHERE ${eventTeamExpr("e")} = ? ORDER BY e.start_time ASC`
        )
        .all(teamId)
    : db
        .prepare(
          `SELECT e.id, e.title, e.opponent, e.start_time, r.result, r.our_score, r.opp_score
           FROM events e JOIN game_results r ON r.event_id = e.id
           ORDER BY e.start_time ASC`
        )
        .all();

  if (games.length === 0) return [];

  const ids = games.map((g) => g.id);
  const placeholders = ids.map(() => "?").join(",");
  const aggs = db
    .prepare(
      `SELECT event_id, kills, assists, aces, blocks
       FROM player_stats WHERE event_id IN (${placeholders})`
    )
    .all(...ids);

  const ptsByEvent = {};
  for (const eventId of ids) ptsByEvent[eventId] = 0;
  const byEvent = {};
  for (const row of aggs) {
    (byEvent[row.event_id] ||= []).push(row);
  }
  for (const [eventId, rows] of Object.entries(byEvent)) {
    ptsByEvent[eventId] = rows.reduce((sum, row) => sum + trendMetric(row), 0);
  }

  return games.map((g) => {
    const pts = ptsByEvent[g.id] ?? 0;
    return {
      label: (g.opponent || g.title || "").slice(0, 10),
      points: pts,
      result: g.result,
      score: `${g.our_score}-${g.opp_score}`,
    };
  });
}