import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sameTeam, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi, canUseGroupChat } from "@/lib/permissions";
import { getRoom, getRoomMembers, getRoomTeamId, isRoomMember } from "@/lib/chats";

/** GET — group chat details and members (members only). */
export async function GET(_req, { params }) {
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

  const room = getRoom(roomId);
  const members = getRoomMembers(roomId);
  return NextResponse.json({ room, members });
}
