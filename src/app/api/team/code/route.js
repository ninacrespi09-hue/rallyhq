import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveTeamId, SPORT_COOKIE } from "@/lib/sportTeams";
import { isSportId } from "@/lib/sports";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Coaches only." }, { status: 403 });

  const sport = (await cookies()).get(SPORT_COOKIE)?.value;
  const teamId =
    (isSportId(sport) ? resolveTeamId(user, sport) : null) || user.team_id;
  const team = teamId
    ? getDb().prepare("SELECT name, code FROM teams WHERE id = ?").get(teamId)
    : null;
  if (!team) return NextResponse.json({ error: "No team found." }, { status: 404 });
  return NextResponse.json(team);
}
