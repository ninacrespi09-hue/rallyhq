import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Coaches add notes to a player's profile.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can add notes." }, { status: 403 });

  const { id } = await params;
  const { note } = await req.json();
  if (!note?.trim()) return NextResponse.json({ error: "Note cannot be empty." }, { status: 400 });

  getDb()
    .prepare("INSERT INTO player_notes (user_id, author_id, note) VALUES (?, ?, ?)")
    .run(Number(id), user.id, note.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can delete notes." }, { status: 403 });
  const { noteId } = await req.json();
  getDb().prepare("DELETE FROM player_notes WHERE id = ?").run(Number(noteId));
  return NextResponse.json({ ok: true });
}
