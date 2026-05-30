import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Coaches post announcements / exercises / info to the team.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can post." }, { status: 403 });

  const { title, body, category, pinned } = await req.json();
  if (!title || !body)
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });

  const cat = ["announcement", "exercise", "info"].includes(category) ? category : "announcement";
  getDb()
    .prepare(
      `INSERT INTO announcements (author_id, title, body, category, pinned)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(user.id, title.trim(), body.trim(), cat, pinned ? 1 : 0);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "coach")
    return NextResponse.json({ error: "Only coaches can delete." }, { status: 403 });
  const { id } = await req.json();
  getDb().prepare("DELETE FROM announcements WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
