import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { answerPlayerVolleyballQuestion } from "@/lib/ai";
import { buildPlayerCoachProfile } from "@/lib/playerCoachData";
import { buildAppContextForAI } from "@/lib/aiAppContext";
import { resolveTeamId } from "@/lib/sportTeams";
import { isSportId } from "@/lib/sports";
import { getDb } from "@/lib/db";

const SCOPE = "player_coach";
const MAX_MESSAGE = 500;

function latestInsight(userId) {
  const row = getDb()
    .prepare(
      `SELECT summary, details_json FROM ai_insights WHERE scope = ? AND user_id = ?
       ORDER BY generated_at DESC LIMIT 1`
    )
    .get(SCOPE, userId);
  if (!row) return null;
  let details = {};
  try {
    details = JSON.parse(row.details_json || "{}");
  } catch {
    details = {};
  }
  return { summary: row.summary, ...details };
}

/** POST — player/coach Q&A about schedule, app content, stats, and training (per sport). */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "player" && user.role !== "coach") {
    return NextResponse.json({ error: "Chat is available for players and coaches only." }, { status: 403 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = String(body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Enter a question." }, { status: 400 });
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Keep questions under ${MAX_MESSAGE} characters.` }, { status: 400 });
  }

  const sport = isSportId(body.sport) ? body.sport : user.active_sport || user.team_sport || "volleyball";
  const teamId = resolveTeamId(user, sport) || user.team_id;

  const history = Array.isArray(body.history)
    ? body.history
        .slice(-10)
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE) }))
    : [];

  let profile =
    user.role === "player"
      ? buildPlayerCoachProfile(user.id, teamId, sport)
      : {
          name: user.name,
          position: "Coach",
          sport,
          gamesPlayed: 0,
          statTotals: {},
          perGameStats: {},
          computedStrengths: [],
          computedImprovements: [],
        };

  if (!profile) return NextResponse.json({ error: "Could not load your profile." }, { status: 400 });

  if (user.role === "player") {
    profile.latestInsight = latestInsight(user.id);
  }

  const appContext = buildAppContextForAI({ teamId, sport, userId: user.id });

  const { reply, source } = await answerPlayerVolleyballQuestion({
    profile,
    message,
    history,
    appContext,
    role: user.role,
  });

  return NextResponse.json({ reply, source });
}
