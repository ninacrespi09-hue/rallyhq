import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, normalizeEmail, isValidEmail } from "@/lib/auth";
import { homePathForUser } from "@/lib/userSportPreference";

export async function POST(req) {
  const { email, password: rawPassword } = await req.json();
  const password = (rawPassword || "").trim();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
  if (!user) {
    return NextResponse.json(
      {
        error: "No account found with that email on this site. Sign up again here if you only created an account on your computer.",
        code: "NO_ACCOUNT",
      },
      { status: 401 }
    );
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Incorrect password. Double-check caps lock and try again.", code: "WRONG_PASSWORD" },
      { status: 401 }
    );
  }

  await createSession(user.id);

  const profile = db
    .prepare(
      `SELECT u.id, u.role, COALESCE(u.sport_preference, t.sport, 'volleyball') AS sport_preference,
              COALESCE(t.sport, 'volleyball') AS team_sport
       FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
    )
    .get(user.id);

  return NextResponse.json({ ok: true, redirect: homePathForUser(profile) });
}
