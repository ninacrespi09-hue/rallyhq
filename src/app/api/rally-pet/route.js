import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserPet, recordDailyVisit, updateUserPet } from "@/lib/rallyPet";

function petJson(pet) {
  return {
    animal: pet.animal,
    emoji: pet.emoji,
    label: pet.label,
    posX: pet.posX,
    posY: pet.posY,
    xp: pet.xp,
    level: pet.level,
    stageLabel: pet.stageLabel,
    scale: pet.scale,
    mood: pet.mood,
    moodLabel: pet.moodLabel,
    xpCurrent: pet.xpCurrent,
    xpNeeded: pet.xpNeeded,
    xpPct: pet.xpPct,
    maxLevel: pet.maxLevel,
  };
}

/** GET — pet snapshot; also records once-per-day visit XP for all roles. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  recordDailyVisit(user.id);
  const pet = getUserPet(user.id);
  return NextResponse.json(petJson(pet));
}

/** POST — update animal choice and/or floating position. */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  try {
    const pet = updateUserPet(user.id, {
      animal: body.animal,
      posX: body.posX,
      posY: body.posY,
    });
    return NextResponse.json({ ok: true, ...petJson(pet) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not update pet." }, { status: 400 });
  }
}
