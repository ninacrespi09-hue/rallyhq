import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, normalizeEmail, isValidEmail } from "@/lib/auth";

export async function POST(req) {
  const { name, email, password: rawPassword, role, team_name, team_code, position, jersey_number, sport } =
    await req.json();
  const password = (rawPassword || "").trim();

  if (!name || !email || !password)
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  if (!isValidEmail(email))
    return NextResponse.json({ error: "Enter a valid email address (e.g. you@gmail.com)." }, { status: 400 });

  const db = getDb();
  const normalizedEmail = normalizeEmail(email);

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing)
    return NextResponse.json(
      { error: "An account with that email already exists. Sign in instead.", code: "EMAIL_EXISTS" },
      { status: 409 }
    );

  let teamId = null;

  if (role === "coach") {
    if (!team_name?.trim())
      return NextResponse.json({ error: "Team name is required." }, { status: 400 });
    if (!team_code?.trim())
      return NextResponse.json({ error: "Team join code is required." }, { status: 400 });

    const code = team_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 4)
      return NextResponse.json({ error: "Team code must be at least 4 letters/numbers." }, { status: 400 });

    const taken = db.prepare("SELECT id FROM teams WHERE code = ?").get(code);
    if (taken)
      return NextResponse.json({ error: "That team code is already taken. Choose a different one." }, { status: 409 });

    const t = db.prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)").run(team_name.trim(), code, sport || "volleyball");
    teamId = t.lastInsertRowid;
  } else if (role === "player" || role === "parent") {
    if (!team_code?.trim())
      return NextResponse.json(
        { error: "Team code is required. Ask your coach for your team code." },
        { status: 400 }
      );

    const code = team_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const team = db.prepare("SELECT id FROM teams WHERE code = ?").get(code);
    if (!team)
      return NextResponse.json(
        { error: "That team code is not valid. Check with your coach and try again." },
        { status: 404 }
      );

    teamId = team.id;
  } else {
    return NextResponse.json({ error: "Invalid signup role." }, { status: 400 });
  }

  const signupRole = role === "coach" ? "coach" : role === "parent" ? "parent" : "player";

  const hash = await hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, team_id, position, jersey_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      normalizedEmail,
      hash,
      signupRole,
      teamId,
      signupRole === "player" ? position || null : null,
      signupRole === "player" && jersey_number ? Number(jersey_number) : null
    );

  if (teamId) {
    const teamSport =
      db.prepare("SELECT sport FROM teams WHERE id = ?").get(teamId)?.sport || sport || "volleyball";
    db.prepare(
      `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, ?, ?)
       ON CONFLICT(user_id, sport) DO NOTHING`
    ).run(info.lastInsertRowid, teamSport, teamId);
  }

  await createSession(info.lastInsertRowid);
  return NextResponse.json({ ok: true });
}
