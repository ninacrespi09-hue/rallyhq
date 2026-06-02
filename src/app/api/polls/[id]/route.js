import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewPoll } from "@/lib/permissions";
import { forbiddenTeam } from "@/lib/tenancy";
import { getPollDetail, pollTeamId } from "@/lib/polls";

/** GET — poll question, choices, vote counts, and caller's vote if any. */
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canViewPoll(user)) {
    return NextResponse.json({ error: "You cannot view this poll." }, { status: 403 });
  }

  const { id } = await params;
  if (pollTeamId(id) !== user.team_id) return forbiddenTeam();

  const poll = getPollDetail(Number(id), user.id);
  if (!poll) return NextResponse.json({ error: "Poll not found." }, { status: 404 });

  return NextResponse.json({ poll });
}
