import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorTeamId, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi } from "@/lib/permissions";
import { awardExerciseComplete } from "@/lib/rallyPet";

// Players mark an exercise complete / incomplete for themselves.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot mark exercises complete." }, { status: 403 });
  }

  const { id } = await params;
  if (authorTeamId("exercises", id) !== user.team_id) return forbiddenTeam();
  const { completed } = await req.json();
  const db = getDb();

  if (completed) {
    const info = db
      .prepare(
        `INSERT INTO exercise_completions (exercise_id, user_id) VALUES (?, ?)
         ON CONFLICT(exercise_id, user_id) DO NOTHING`
      )
      .run(Number(id), user.id);
    if (info.changes > 0) awardExerciseComplete(user.id, Number(id));
  } else {
    db.prepare("DELETE FROM exercise_completions WHERE exercise_id = ? AND user_id = ?").run(
      Number(id),
      user.id
    );
  }
  return NextResponse.json({ ok: true });
}
