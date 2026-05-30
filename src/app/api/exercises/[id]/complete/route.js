import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Players mark an exercise complete / incomplete for themselves.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const { completed } = await req.json();
  const db = getDb();

  if (completed) {
    db.prepare(
      `INSERT INTO exercise_completions (exercise_id, user_id) VALUES (?, ?)
       ON CONFLICT(exercise_id, user_id) DO NOTHING`
    ).run(Number(id), user.id);
  } else {
    db.prepare("DELETE FROM exercise_completions WHERE exercise_id = ? AND user_id = ?").run(
      Number(id),
      user.id
    );
  }
  return NextResponse.json({ ok: true });
}
