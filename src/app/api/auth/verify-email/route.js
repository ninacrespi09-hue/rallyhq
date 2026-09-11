import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authTokens";
import { createSession } from "@/lib/auth";
import { homePathForUser } from "@/lib/userSportPreference";

export async function POST(req) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }

  const result = consumeAuthToken(token, "verify_email");
  if (!result) {
    return NextResponse.json(
      { error: "This verification link is invalid or has expired. Request a new one.", code: "INVALID_TOKEN" },
      { status: 400 }
    );
  }

  const db = getDb();
  db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(result.userId);
  await createSession(result.userId);

  const profile = db
    .prepare(
      `SELECT u.id, u.role, COALESCE(u.sport_preference, t.sport, 'volleyball') AS sport_preference,
              COALESCE(t.sport, 'volleyball') AS team_sport
       FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
    )
    .get(result.userId);

  return NextResponse.json({ ok: true, redirect: homePathForUser(profile) });
}
