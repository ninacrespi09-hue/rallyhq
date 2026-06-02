import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sameTeam, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi, canUseGroupChat } from "@/lib/permissions";
import { getMessages, getRoomTeamId, isRoomMember, sendMessage } from "@/lib/chats";

/** GET — messages. POST — send a message. */
export async function GET(req, { params }) {
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

  const sp = req.nextUrl.searchParams;
  const beforeId = sp.get("before") ? Number(sp.get("before")) : null;
  const limit = Math.min(Number(sp.get("limit")) || 50, 100);
  const messages = getMessages(roomId, limit, beforeId);
  return NextResponse.json({ messages });
}

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

  const result = sendMessage(roomId, user.id, body.body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.message });
}
