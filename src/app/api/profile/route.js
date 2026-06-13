import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  SPORT_PREF_COOKIE,
  normalizeSportPreference,
  homePathForUser,
} from "@/lib/userSportPreference";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365 * 10,
};

// Update the logged-in user's own profile.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { name, position, jersey_number, height_cm, bio, sport_preference } = await req.json();
  const pref = normalizeSportPreference(sport_preference, user.sport_preference || "volleyball");

  getDb()
    .prepare(
      `UPDATE users SET name = ?, position = ?, jersey_number = ?, height_cm = ?, bio = ?, sport_preference = ?
       WHERE id = ?`
    )
    .run(
      name?.trim() || user.name,
      position || null,
      jersey_number ? Number(jersey_number) : null,
      height_cm ? Number(height_cm) : null,
      bio || null,
      pref,
      user.id
    );

  const jar = await cookies();
  jar.set(SPORT_PREF_COOKIE, pref, COOKIE_OPTS);

  const updated = getDb()
    .prepare(
      `SELECT u.id, u.role, COALESCE(u.sport_preference, t.sport, 'volleyball') AS sport_preference,
              COALESCE(t.sport, 'volleyball') AS team_sport
       FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
    )
    .get(user.id);

  return NextResponse.json({ ok: true, redirect: homePathForUser(updated) });
}
