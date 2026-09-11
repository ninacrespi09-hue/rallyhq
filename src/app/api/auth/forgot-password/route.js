import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth";
import { createAuthToken } from "@/lib/authTokens";
import { sendPasswordResetEmail } from "@/lib/authEmail";

export async function POST(req) {
  const { email } = await req.json();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);

  // Always return the same message (no account enumeration).
  if (user) {
    const rawToken = createAuthToken(user.id, "reset_password", 60);
    const sent = await sendPasswordResetEmail(normalizedEmail, rawToken);
    const payload = { ok: true };
    if (sent.mocked && process.env.NODE_ENV !== "production") {
      payload.devResetLink = sent.link;
    }
    return NextResponse.json(payload);
  }

  return NextResponse.json({ ok: true });
}
