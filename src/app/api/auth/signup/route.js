import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req) {
  const { name, email, password, role, position, jersey_number } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, position, jersey_number)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      email.toLowerCase().trim(),
      hash,
      role === "coach" ? "coach" : "player",
      position || null,
      jersey_number ? Number(jersey_number) : null
    );

  await createSession(info.lastInsertRowid);
  return NextResponse.json({ ok: true });
}
