import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canCreatePoll } from "@/lib/permissions";
import { createPoll } from "@/lib/polls";

/** POST — coach creates a team poll (question + 2–5 choices). */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!canCreatePoll(user)) {
    return NextResponse.json({ error: "Only coaches can create polls." }, { status: 403 });
  }
  if (!user.team_id) return NextResponse.json({ error: "No team found." }, { status: 403 });

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const question = (body.question || "").trim();
  const choices = (Array.isArray(body.choices) ? body.choices : [])
    .map((c) => String(c).trim())
    .filter(Boolean);

  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }
  if (choices.length < 2 || choices.length > 5) {
    return NextResponse.json({ error: "Provide 2 to 5 answer choices." }, { status: 400 });
  }

  const pollId = createPoll({
    authorId: user.id,
    teamId: user.team_id,
    question,
    choices,
    pinned: !!body.pinned,
  });

  return NextResponse.json({ ok: true, id: pollId });
}
