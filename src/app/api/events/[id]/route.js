import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, forbiddenTeam } from "@/lib/tenancy";

// Edit an event (coaches only).
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can edit events." }, { status: 403 });

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();
  const { type, title, opponent, location, start_time, end_time, notes } = await req.json();

  getDb()
    .prepare(
      `UPDATE events SET type=?, title=?, opponent=?, location=?, start_time=?, end_time=?, notes=?
       WHERE id=?`
    )
    .run(type, title, opponent || null, location || null, start_time, end_time || null, notes || null, Number(id));

  return NextResponse.json({ ok: true });
}

// Delete an event (coaches only).
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can delete events." }, { status: 403 });

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();
  getDb().prepare("DELETE FROM events WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
