import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sameTeam, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi, canUseGroupChat } from "@/lib/permissions";
import { addRoomMembers, getRoomMembers, getRoomTeamId, isRoomMember } from "@/lib/chats";

/** POST — invite teammates to an existing group chat. */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Group chat is not available for parent accounts." }, { status: 403 });
  }
  if (!canUseGroupChat(user)) {
    return NextResponse.json({ error: "Join a team to use group chat." }, { status: 403 });
  }

  const { id } = await params;
  const roomId = Number(id);
  const teamId = getRoomTeamId(roomId);
  if (!teamId || !sameTeam(user, teamId)) return forbiddenTeam();
  if (!isRoomMember(roomId, user.id)) {
    return NextResponse.json({ error: "You are not in this chat." }, { status: 403 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = addRoomMembers(roomId, user.id, body.memberIds || []);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const members = getRoomMembers(roomId);
  return NextResponse.json({ ok: true, added: result.added, members });
}
