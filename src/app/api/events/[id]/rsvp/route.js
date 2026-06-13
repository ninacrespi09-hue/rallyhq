import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { isCoach, isParent, canRsvp, RSVP_STATUSES } from "@/lib/permissions";

function assertPlayerOnTeam(userId, teamId) {
  const row = getDb()
    .prepare("SELECT id FROM users WHERE id = ? AND team_id = ? AND role = 'player'")
    .get(userId, teamId);
  return !!row;
}

function assertParentOnTeam(userId, teamId) {
  const row = getDb()
    .prepare("SELECT id FROM users WHERE id = ? AND team_id = ? AND role = 'parent'")
    .get(userId, teamId);
  return !!row;
}

/** Set or update a player's or parent's RSVP for an event. */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isCoach(user) && !canRsvp(user)) {
    return NextResponse.json({ error: "You cannot RSVP for this event." }, { status: 403 });
  }

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();

  const { user_id, status } = await req.json();
  const targetId = isCoach(user) && user_id ? Number(user_id) : user.id;

  if (!isCoach(user) && targetId !== user.id) {
    return NextResponse.json({ error: "You can only RSVP for yourself." }, { status: 403 });
  }
  if (userTeamId(targetId) !== user.team_id) return forbiddenTeam();

  if (isParent(user)) {
    if (!assertParentOnTeam(targetId, user.team_id)) {
      return NextResponse.json({ error: "Parent is not on this team." }, { status: 400 });
    }
  } else if (!assertPlayerOnTeam(targetId, user.team_id)) {
    return NextResponse.json({ error: "RSVP is for players only." }, { status: 400 });
  }

  if (!RSVP_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid RSVP status." }, { status: 400 });
  }

  getDb()
    .prepare(
      `INSERT INTO event_rsvps (event_id, user_id, status, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         status = excluded.status,
         updated_at = excluded.updated_at`
    )
    .run(Number(id), targetId, status);

  return NextResponse.json({ ok: true });
}

/** Clear an RSVP (player/parent: self only; coach: any player). */
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isCoach(user) && !canRsvp(user)) {
    return NextResponse.json({ error: "You cannot change RSVPs." }, { status: 403 });
  }

  const { id } = await params;
  if (eventTeamId(id) !== user.team_id) return forbiddenTeam();

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const targetId = isCoach(user) && body.user_id ? Number(body.user_id) : user.id;
  if (!isCoach(user) && targetId !== user.id) {
    return NextResponse.json({ error: "You can only clear your own RSVP." }, { status: 403 });
  }
  if (userTeamId(targetId) !== user.team_id) return forbiddenTeam();

  getDb().prepare("DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?").run(Number(id), targetId);

  return NextResponse.json({ ok: true });
}
