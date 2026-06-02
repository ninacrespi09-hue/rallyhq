import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blockParentApi, canUseGroupChat } from "@/lib/permissions";
import { createRoom, listRoomsForUser } from "@/lib/chats";

/** GET — list group chats the user belongs to. POST — create a new group chat. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Group chat is not available for parent accounts." }, { status: 403 });
  }
  if (!canUseGroupChat(user)) {
    return NextResponse.json({ error: "Join a team to use group chat." }, { status: 403 });
  }

  const rooms = listRoomsForUser(user.id);
  return NextResponse.json({ rooms });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Group chat is not available for parent accounts." }, { status: 403 });
  }
  if (!canUseGroupChat(user)) {
    return NextResponse.json({ error: "Join a team to use group chat." }, { status: 403 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const result = createRoom({
    teamId: user.team_id,
    creatorId: user.id,
    name: body.name,
    memberIds: body.memberIds || [],
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

  const rooms = listRoomsForUser(user.id);
  const room = rooms.find((r) => r.id === result.roomId);
  return NextResponse.json({ ok: true, roomId: result.roomId, room });
}
