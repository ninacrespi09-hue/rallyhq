import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Coaches only." }, { status: 403 });

  const team = getDb().prepare("SELECT name, code FROM teams WHERE id = ?").get(user.team_id);
  if (!team) return NextResponse.json({ error: "No team found." }, { status: 404 });
  return NextResponse.json(team);
}
