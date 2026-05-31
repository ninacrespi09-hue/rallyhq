import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, forbiddenTeam } from "@/lib/tenancy";

// Coaches create practices / games / tournaments.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can create events." }, { status: 403 });
  if (!user.team_id) return NextResponse.json({ error: "No team found." }, { status: 403 });

  const { type, title, opponent, location, start_time, end_time, notes } = await req.json();
  if (!type || !title || !start_time) {
    return NextResponse.json({ error: "Type, title, and start time are required." }, { status: 400 });
  }

  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO events (type, title, opponent, location, start_time, end_time, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(type, title.trim(), opponent || null, location || null, start_time, end_time || null, notes || null, user.id);

  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can delete events." }, { status: 403 });
  const { id } = await req.json();
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();
  getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
