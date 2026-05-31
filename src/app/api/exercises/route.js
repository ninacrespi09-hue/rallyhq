import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorTeamId, forbiddenTeam } from "@/lib/tenancy";

// Coaches create and edit exercises.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can create exercises." }, { status: 403 });

  const { title, instructions, reps, difficulty, category, coach_notes } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const info = getDb()
    .prepare(
      `INSERT INTO exercises (title, instructions, reps, difficulty, category, coach_notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      instructions || null,
      reps || null,
      difficulty || "Beginner",
      category || "Skills",
      coach_notes || null,
      user.id
    );
  return NextResponse.json({ ok: true, id: info.lastInsertRowid });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can edit exercises." }, { status: 403 });

  const { id, title, instructions, reps, difficulty, category, coach_notes } = await req.json();
  if (authorTeamId("exercises", id) !== user.team_id) return forbiddenTeam();
  getDb()
    .prepare(
      `UPDATE exercises SET title=?, instructions=?, reps=?, difficulty=?, category=?, coach_notes=? WHERE id=?`
    )
    .run(title.trim(), instructions || null, reps || null, difficulty, category, coach_notes || null, Number(id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can delete exercises." }, { status: 403 });
  const { id } = await req.json();
  if (authorTeamId("exercises", id) !== user.team_id) return forbiddenTeam();
  getDb().prepare("DELETE FROM exercises WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
