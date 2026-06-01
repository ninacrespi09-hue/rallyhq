import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { STATS, statTotals } from "@/lib/stats";
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

  const body = await req.json();
  const desired = {};
  for (const s of STATS) {
    desired[s.key] = Math.max(0, Number(body[s.key]) || 0);
  }

  const db = getDb();
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
        `SELECT e.id FROM events e JOIN users u ON u.id = e.created_by
         WHERE u.team_id = ? AND e.title = 'Season stat entry' LIMIT 1`
      )
      .get(user.team_id)?.id;

    if (!eventId) {
      eventId = db
        .prepare(
          `INSERT INTO events (title, type, start_time, created_by, opponent)
           VALUES ('Season stat entry', 'game', datetime('now'), ?, 'Coach entry')`
        )
        .run(user.id).lastInsertRowid;
    }

    db.prepare(
      `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, blocks, digs, aces, assists, errors)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`
    ).run(
      eventId,
      playerId,
      user.id,
      desired.kills,
      desired.hits,
      desired.blocks,
      desired.digs,
      desired.aces
    );
  } else if (rows.length === 1) {
    db.prepare(
      `UPDATE player_stats SET kills=?, hits=?, blocks=?, digs=?, aces=?, recorded_by=? WHERE id=?`
    ).run(
      desired.kills,
      desired.hits,
      desired.blocks,
      desired.digs,
      desired.aces,
      user.id,
      rows[0].id
    );
  } else {
    const latest = rows[0];
    const others = rows.slice(1);
    const updated = {};
    for (const s of STATS) {
      const otherSum = others.reduce((sum, row) => sum + (row[s.key] || 0), 0);
      updated[s.key] = Math.max(0, desired[s.key] - otherSum);
    }
    db.prepare(
      `UPDATE player_stats SET kills=?, hits=?, blocks=?, digs=?, aces=?, recorded_by=? WHERE id=?`
    ).run(
      updated.kills,
      updated.hits,
      updated.blocks,
      updated.digs,
      updated.aces,
      user.id,
      latest.id
    );
  }

  const totals = statTotals(playerId);
  await regeneratePlayerCoachInsight(playerId, user.team_id);
  return NextResponse.json({ ok: true, totals });
}
