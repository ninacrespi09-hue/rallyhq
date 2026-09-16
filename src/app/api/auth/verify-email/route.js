import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { consumeAuthToken } from "@/lib/authTokens";
import { createSession, normalizeEmail } from "@/lib/auth";
import { homePathForUser } from "@/lib/userSportPreference";

export async function POST(req) {
  const body = await req.json();
  // Always treat the code/token as a string (JSON may send digits as a number).
  const token = String(body.token ?? "").trim();
  const email = body.email ? normalizeEmail(body.email) : "";

  if (!token) {
    return NextResponse.json({ error: "Missing verification code." }, { status: 400 });
  }

  console.info("[auth-verify] attempt", {
    tokenLength: token.length,
    hasEmail: Boolean(email),
  });

  const result = consumeAuthToken(token, "verify_email", email || undefined);
  if (!result) {
    return NextResponse.json(
      {
        error: "That verification code is invalid or has expired. Request a new one.",
        code: "INVALID_TOKEN",
      },
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

  console.info("[auth-verify] success", {
    userId: result.userId,
    alreadyVerified: Boolean(result.alreadyVerified),
  });

  return NextResponse.json({ ok: true, redirect: homePathForUser(profile) });
}
