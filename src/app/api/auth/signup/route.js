import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req) {
  const { name, email, password, role, team_name, team_code, position, jersey_number } = await req.json();

  if (!name || !email || !password)
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });

  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase().trim());
  if (existing)
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

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

    const t = db.prepare("INSERT INTO teams (name, code) VALUES (?, ?)").run(team_name.trim(), code);
    teamId = t.lastInsertRowid;
  } else {
    // Player joins an existing team via code.
    if (!team_code?.trim())
      return NextResponse.json({ error: "Team code is required to join a team." }, { status: 400 });

    const team = db.prepare("SELECT id FROM teams WHERE code = ?").get(team_code.trim().toUpperCase());
    if (!team)
      return NextResponse.json({ error: "Team code not found. Ask your coach for the correct code." }, { status: 404 });

    teamId = team.id;
  }

  const hash = await hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, team_id, position, jersey_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      email.toLowerCase().trim(),
      hash,
      role === "coach" ? "coach" : "player",
      teamId,
      position || null,
      jersey_number ? Number(jersey_number) : null
    );

  await createSession(info.lastInsertRowid);
  return NextResponse.json({ ok: true });
}
