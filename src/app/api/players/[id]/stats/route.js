import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { eventTeamExpr } from "@/lib/teamScope";
import { statTotals } from "@/lib/stats";
import { getStatsForSport } from "@/lib/sports";
import { editableStatKeys } from "@/lib/statAgg";
import { regeneratePlayerCoachInsight } from "@/lib/playerCoachInsight";

/** Coach sets a player's season stat totals (updates underlying game records). */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "coach") {
    return NextResponse.json({ error: "Only coaches can edit season statistics." }, { status: 403 });
  }

  const playerId = Number((await params).id);
  if (userTeamId(playerId) !== user.team_id) return forbiddenTeam();

  const db = getDb();
  const sport =
    db.prepare("SELECT sport FROM teams WHERE id = ?").get(user.team_id)?.sport || "volleyball";
  const statDefs = getStatsForSport(sport);
  const keys = editableStatKeys(statDefs);

  const body = await req.json();
  const desired = {};
  for (const key of keys) {
    desired[key] = Math.max(0, Number(body[key]) || 0);
  }

  const rows = db
    .prepare(
      `SELECT ps.* FROM player_stats ps
       JOIN events e ON e.id = ps.event_id
       WHERE ps.user_id = ?
       ORDER BY e.start_time DESC`
    )
    .all(playerId);

  if (rows.length === 0) {
    let eventId = db
      .prepare(
        `SELECT e.id FROM events e
         WHERE ${eventTeamExpr("e")} = ? AND e.title = 'Season stat entry' LIMIT 1`
      )
      .get(user.team_id)?.id;

    if (!eventId) {
      eventId = db
        .prepare(
          `INSERT INTO events (title, type, start_time, created_by, opponent, team_id)
           VALUES ('Season stat entry', 'game', datetime('now'), ?, 'Coach entry', ?)`
        )
        .run(user.id, user.team_id).lastInsertRowid;
    }

    const cols = ["event_id", "user_id", "recorded_by", ...keys];
    const placeholders = cols.map(() => "?").join(", ");
    db.prepare(
      `INSERT INTO player_stats (${cols.join(", ")}) VALUES (${placeholders})`
    ).run(eventId, playerId, user.id, ...keys.map((k) => desired[k]));
  } else if (rows.length === 1) {
    const setClause = keys.map((k) => `${k}=?`).join(", ");
    db.prepare(`UPDATE player_stats SET ${setClause}, recorded_by=? WHERE id=?`).run(
      ...keys.map((k) => desired[k]),
      user.id,
      rows[0].id
    );
  } else {
    const latest = rows[0];
    const others = rows.slice(1);
    const updated = {};
    for (const key of keys) {
      const otherSum = others.reduce((sum, row) => sum + (row[key] || 0), 0);
      updated[key] = Math.max(0, desired[key] - otherSum);
    }
    const setClause = keys.map((k) => `${k}=?`).join(", ");
    db.prepare(`UPDATE player_stats SET ${setClause}, recorded_by=? WHERE id=?`).run(
      ...keys.map((k) => updated[k]),
      user.id,
      latest.id
    );
  }

  const totals = statTotals(playerId, user.team_id, sport);
  await regeneratePlayerCoachInsight(playerId, user.team_id);
  return NextResponse.json({ ok: true, totals });
}
