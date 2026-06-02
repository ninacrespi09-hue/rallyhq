import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { blockParentApi, canVotePoll, isCoach } from "@/lib/permissions";
import { forbiddenTeam } from "@/lib/tenancy";
import { castVote, pollTeamId } from "@/lib/polls";

/** POST — player casts one vote on a poll. */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot vote." }, { status: 403 });
  }
  if (isCoach(user)) {
    return NextResponse.json({ error: "Coaches cannot vote on polls." }, { status: 403 });
  }
  if (!canVotePoll(user)) {
    return NextResponse.json({ error: "Only players can vote." }, { status: 403 });
  }

  const { id } = await params;
  if (pollTeamId(id) !== user.team_id) return forbiddenTeam();

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const optionId = Number(body.option_id);
  if (!optionId) {
    return NextResponse.json({ error: "option_id is required." }, { status: 400 });
  }

  const result = castVote(Number(id), user.id, optionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
