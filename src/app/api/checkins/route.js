import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { blockParentApi } from "@/lib/permissions";
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot submit wellness check-ins." }, { status: 403 });
  }

  const { date, soreness, energy, mood, injury, sore_areas, note } = await req.json();
  const day = date || new Date().toISOString().slice(0, 10);

  const db = getDb();
  // Upsert: one check-in per player per day.
  db.prepare(
    `INSERT INTO checkins (user_id, date, soreness, energy, mood, injury, sore_areas, note)
     VALUES (@user_id, @date, @soreness, @energy, @mood, @injury, @sore_areas, @note)
     ON CONFLICT(user_id, date) DO UPDATE SET
       soreness=@soreness, energy=@energy, mood=@mood,
       injury=@injury, sore_areas=@sore_areas, note=@note`
  ).run({
    user_id: user.id,
    date: day,
    soreness: clamp(soreness),
    energy: clamp(energy),
    mood: clamp(mood),
    injury: injury ? 1 : 0,
    sore_areas: sore_areas || null,
    note: note || null,
  });

  return NextResponse.json({ ok: true });
}

function clamp(n) {
  const v = Number(n);
  return Math.max(1, Math.min(5, Number.isFinite(v) ? v : 3));
}
