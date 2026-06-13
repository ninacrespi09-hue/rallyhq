import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { blockParentApi, isPlayer } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot view wellness kit suggestions." }, { status: 403 });
  }
  if (!user.team_id) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = getDb()
    .prepare(
      `SELECT s.id, s.suggestion, s.created_at, u.id AS user_id, u.name AS author_name
       FROM wellness_kit_suggestions s
       JOIN users u ON u.id = s.user_id
       WHERE u.team_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(user.team_id);

  return NextResponse.json({ suggestions });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot submit wellness kit suggestions." }, { status: 403 });
  }
  if (!isPlayer(user)) {
    return NextResponse.json({ error: "Only players can suggest wellness kit items." }, { status: 403 });
  }

  const { suggestion } = await req.json();
  const text = (suggestion || "").trim();
  if (!text) {
    return NextResponse.json({ error: "Enter what you'd like in your wellness kit." }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "Keep your suggestion under 200 characters." }, { status: 400 });
  }

  const result = getDb()
    .prepare("INSERT INTO wellness_kit_suggestions (user_id, suggestion) VALUES (?, ?)")
    .run(user.id, text);

  return NextResponse.json({
    ok: true,
    id: result.lastInsertRowid,
    suggestion: text,
    author_name: user.name,
    user_id: user.id,
    created_at: new Date().toISOString(),
  });
}
