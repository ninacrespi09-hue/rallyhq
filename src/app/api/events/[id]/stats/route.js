import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Record per-player stats for a game. Any authenticated teammate can help
 * record stats (a requested feature), so we allow all logged-in users.
 */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const { user_id, kills, hits, assists, aces, digs, blocks, errors } = await req.json();
  if (!user_id) return NextResponse.json({ error: "Player is required." }, { status: 400 });

  const n = (v) => Math.max(0, Number(v) || 0);

  getDb()
    .prepare(
      `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors)
       VALUES (@event_id, @user_id, @recorded_by, @kills, @hits, @assists, @aces, @digs, @blocks, @errors)
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         kills=@kills, hits=@hits, assists=@assists, aces=@aces, digs=@digs,
         blocks=@blocks, errors=@errors, recorded_by=@recorded_by`
    )
    .run({
      event_id: Number(id),
      user_id: Number(user_id),
      recorded_by: user.id,
      kills: n(kills),
      hits: n(hits),
      assists: n(assists),
      aces: n(aces),
      digs: n(digs),
      blocks: n(blocks),
      errors: n(errors),
    });

  return NextResponse.json({ ok: true });
}
