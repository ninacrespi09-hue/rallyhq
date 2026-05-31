import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { authorTeamId, forbiddenTeam } from "@/lib/tenancy";

// Toggle a per-user like on a photo; returns the new count + liked state.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const mediaId = Number(id);
  if (authorTeamId("media", mediaId) !== user.team_id) return forbiddenTeam();
  const db = getDb();

  const existing = db
    .prepare("SELECT 1 FROM media_likes WHERE media_id = ? AND user_id = ?")
    .get(mediaId, user.id);

  if (existing) {
    db.prepare("DELETE FROM media_likes WHERE media_id = ? AND user_id = ?").run(mediaId, user.id);
  } else {
    db.prepare("INSERT OR IGNORE INTO media_likes (media_id, user_id) VALUES (?, ?)").run(mediaId, user.id);
  }

  const count = db.prepare("SELECT COUNT(*) AS n FROM media_likes WHERE media_id = ?").get(mediaId).n;
  return NextResponse.json({ ok: true, liked: !existing, count });
}
