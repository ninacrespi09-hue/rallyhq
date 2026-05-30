import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Submit a player's post-game wellness check-in for a specific game.
 * Players submit their own; coaches may submit on a player's behalf.
 */
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const targetId = user.role === "coach" && body.user_id ? Number(body.user_id) : user.id;

  const clamp = (n) => {
    const v = Number(n);
    return Math.max(1, Math.min(5, Number.isFinite(v) ? v : 3));
  };

  getDb()
    .prepare(
      `INSERT INTO post_game_checkins
         (event_id, user_id, soreness, energy, mood, recovery, injury, sore_areas, recovery_needs, note)
       VALUES (@event_id, @user_id, @soreness, @energy, @mood, @recovery, @injury, @sore_areas, @recovery_needs, @note)
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         soreness=@soreness, energy=@energy, mood=@mood, recovery=@recovery,
         injury=@injury, sore_areas=@sore_areas, recovery_needs=@recovery_needs, note=@note`
    )
    .run({
      event_id: Number(id),
      user_id: targetId,
      soreness: clamp(body.soreness),
      energy: clamp(body.energy),
      mood: clamp(body.mood),
      recovery: clamp(body.recovery),
      injury: body.injury ? 1 : 0,
      sore_areas: body.sore_areas || null,
      recovery_needs: body.recovery_needs || null,
      note: body.note || null,
    });

  return NextResponse.json({ ok: true });
}
