import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { analyzeCheckins } from "@/lib/ai";

/**
 * Generate AI insights from recent check-ins.
 * Coaches get team-wide analysis; players get their own.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const db = getDb();
  const scope = user.role === "coach" ? "team" : "player";

  const checkins =
    scope === "team"
      ? db
          .prepare(
            `SELECT u.name, c.date, c.soreness, c.energy, c.mood, c.injury, c.sore_areas, c.note
             FROM checkins c JOIN users u ON u.id = c.user_id
             WHERE u.team_id = ? AND c.date >= date('now', '-14 days')
             ORDER BY c.date DESC LIMIT 200`
          )
          .all(user.team_id)
      : db
          .prepare(
            `SELECT u.name, c.date, c.soreness, c.energy, c.mood, c.injury, c.sore_areas, c.note
             FROM checkins c JOIN users u ON u.id = c.user_id
             WHERE c.user_id = ? AND c.date >= date('now', '-14 days')
             ORDER BY c.date DESC LIMIT 60`
          )
          .all(user.id);

  const result = await analyzeCheckins({ scope, checkins });

  db.prepare(
    `INSERT INTO ai_insights (scope, user_id, summary, details_json, source)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    scope,
    scope === "player" ? user.id : null,
    result.summary,
    JSON.stringify(result.flags),
    result.source
  );

  return NextResponse.json(result);
}
