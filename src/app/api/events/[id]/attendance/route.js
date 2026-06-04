import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi, isCoach } from "@/lib/permissions";
import { awardEventAttendance } from "@/lib/rallyPet";

// Coaches set attendance for any player; players may set their own.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot set attendance." }, { status: 403 });
  }

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();

  const { user_id, status } = await req.json();
  const targetId = isCoach(user) ? user_id : user.id;
  if (userTeamId(targetId) !== user.team_id) return forbiddenTeam();

  const valid = ["present", "late", "absent", "excused"];
  if (!valid.includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  getDb()
    .prepare(
      `INSERT INTO attendance (event_id, user_id, status) VALUES (?, ?, ?)
       ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`
    )
    .run(Number(id), targetId, status);

  if (status === "present" || status === "late") {
    const target = getDb().prepare(`SELECT role FROM users WHERE id = ?`).get(targetId);
    if (target?.role === "player") {
      awardEventAttendance(targetId, Number(id));
    }
  }

  return NextResponse.json({ ok: true });
}
