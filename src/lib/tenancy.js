import { NextResponse } from "next/server";
import { getDb } from "./db";

/** Team id for an event (via the coach who created it). */
export function eventTeamId(eventId) {
  return getDb()
    .prepare(
      `SELECT u.team_id FROM events e JOIN users u ON u.id = e.created_by WHERE e.id = ?`
    )
    .get(Number(eventId))?.team_id;
}

/** Team id for a user row. */
export function userTeamId(userId) {
  return getDb().prepare("SELECT team_id FROM users WHERE id = ?").get(Number(userId))?.team_id;
}

/** Team id for content owned by a user (announcements, exercises, media). */
export function authorTeamId(table, id) {
  const allowed = { announcements: "author_id", exercises: "created_by", media: "uploaded_by" };
  const col = allowed[table];
  if (!col) return null;
  return getDb()
    .prepare(`SELECT u.team_id FROM ${table} t JOIN users u ON u.id = t.${col} WHERE t.id = ?`)
    .get(Number(id))?.team_id;
}

export function sameTeam(user, teamId) {
  return user?.team_id && teamId && user.team_id === teamId;
}

export function forbiddenTeam() {
  return NextResponse.json({ error: "You don't have access to this team's data." }, { status: 403 });
}

/** API helper: returns 403 response if event is not on the user's team. */
export function requireEventAccess(user, eventId) {
  const tid = eventTeamId(eventId);
  if (!tid || !sameTeam(user, tid)) return forbiddenTeam();
  return null;
}

/** API helper: returns 403 if target user is not on the same team. */
export function requireUserAccess(user, targetUserId) {
  const tid = userTeamId(targetUserId);
  if (!tid || !sameTeam(user, tid)) return forbiddenTeam();
  return null;
}
