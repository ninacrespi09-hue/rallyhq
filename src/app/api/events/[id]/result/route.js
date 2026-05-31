import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, forbiddenTeam } from "@/lib/tenancy";

// Record / update a game result (coaches only).
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can record results." }, { status: 403 });

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();
  const { our_score, opp_score, sets } = await req.json();
  const ours = Number(our_score) || 0;
  const opp = Number(opp_score) || 0;
  const result = ours >= opp ? "W" : "L";

  getDb()
    .prepare(
      `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(event_id) DO UPDATE SET
         our_score=excluded.our_score, opp_score=excluded.opp_score,
         result=excluded.result, sets_json=excluded.sets_json`
    )
    .run(Number(id), ours, opp, result, JSON.stringify(sets || []));

  return NextResponse.json({ ok: true, result });
}
