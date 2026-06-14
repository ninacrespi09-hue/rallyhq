import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { regeneratePlayerCoachInsight } from "@/lib/playerCoachInsight";
import { blockParentApi, isCoach } from "@/lib/permissions";

const STAT_COLUMNS = [
  "kills",
  "hits",
  "assists",
  "aces",
  "digs",
  "blocks",
  "errors",
  "service_receptions",
  "interceptions",
  "def_blocks",
  "yellow_cards",
  "red_cards",
];

/**
 * Record per-player stats for a game. Any authenticated teammate can help
 * record stats (a requested feature), so we allow all logged-in users.
 */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot edit stats." }, { status: 403 });
  }

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();

  const body = await req.json();
  const { user_id } = body;
  if (!user_id) return NextResponse.json({ error: "Player is required." }, { status: 400 });
  if (userTeamId(user_id) !== user.team_id) return forbiddenTeam();

  const targetId = Number(user_id);
  if (!isCoach(user) && targetId !== user.id) {
    return NextResponse.json({ error: "Only coaches can edit other players' stats." }, { status: 403 });
  }

  const n = (v) => Math.max(0, Number(v) || 0);
  const values = { event_id: Number(id), user_id: targetId, recorded_by: user.id };
  for (const col of STAT_COLUMNS) {
    values[col] = n(body[col]);
  }

  const cols = ["event_id", "user_id", "recorded_by", ...STAT_COLUMNS];
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  const updates = STAT_COLUMNS.map((c) => `${c}=@${c}`).join(", ");

  getDb()
    .prepare(
      `INSERT INTO player_stats (${cols.join(", ")})
       VALUES (${placeholders})
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         ${updates}, recorded_by=@recorded_by`
    )
    .run(values);

  await regeneratePlayerCoachInsight(targetId, user.team_id);

  return NextResponse.json({ ok: true });
}
