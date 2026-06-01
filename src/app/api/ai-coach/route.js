import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { userTeamId } from "@/lib/tenancy";
import { teamPlayerIds } from "@/lib/playerCoachData";
import {
  getLatestPlayerCoachInsight,
  getLatestPlayerCoachInsights,
  regeneratePlayerCoachInsight,
} from "@/lib/playerCoachInsight";
import { blockParentApi, isCoach, isPlayer } from "@/lib/permissions";

async function generateForPlayer(playerId, teamId) {
  const result = await regeneratePlayerCoachInsight(playerId, teamId);
  if (!result) return null;
  const player = getDb()
    .prepare("SELECT name, position FROM users WHERE id = ?")
    .get(playerId);
  return {
    playerId,
    name: player?.name,
    position: player?.position,
    insight: result,
  };
}

/** GET — latest saved AI coach insights (player: self only; coach: whole team). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "AI Coach is not available for parent accounts." }, { status: 403 });
  }

  if (isPlayer(user)) {
    const insight = getLatestPlayerCoachInsight(user.id);
    return NextResponse.json({
      role: "player",
      player: { id: user.id, name: user.name, insight },
    });
  }

  const roster = teamPlayerIds(user.team_id);
  const insightMap = getLatestPlayerCoachInsights(roster.map((p) => p.id));
  const players = roster.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    jersey_number: p.jersey_number,
    insight: insightMap[p.id] ?? null,
  }));

  return NextResponse.json({ role: "coach", players });
}

/** POST — generate fresh AI coach insights. Coach may pass { playerId } for one player. */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "AI Coach is not available for parent accounts." }, { status: 403 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (isPlayer(user)) {
    const out = await generateForPlayer(user.id, user.team_id);
    if (!out) return NextResponse.json({ error: "Could not build your profile." }, { status: 400 });
    return NextResponse.json({
      role: "player",
      player: { id: out.playerId, name: out.name, insight: out.insight },
    });
  }

  const targetId = body.playerId ? Number(body.playerId) : null;
  if (targetId) {
    if (userTeamId(targetId) !== user.team_id) {
      return NextResponse.json({ error: "Player not on your team." }, { status: 403 });
    }
    const out = await generateForPlayer(targetId, user.team_id);
    if (!out) return NextResponse.json({ error: "Player not found." }, { status: 404 });
    return NextResponse.json({ role: "coach", updated: [out] });
  }

  const roster = teamPlayerIds(user.team_id);
  const updated = [];
  for (const p of roster) {
    const out = await generateForPlayer(p.id, user.team_id);
    if (out) updated.push(out);
  }

  return NextResponse.json({ role: "coach", updated });
}
