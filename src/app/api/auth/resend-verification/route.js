import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizeEmail, isValidEmail } from "@/lib/auth";
import { createAuthToken } from "@/lib/authTokens";
import { sendVerificationEmail } from "@/lib/authEmail";

export async function POST(req) {
  const { email } = await req.json();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = getDb();
  const normalizedEmail = normalizeEmail(email);
  const user = db.prepare("SELECT id, email_verified FROM users WHERE email = ?").get(normalizedEmail);

  // Always return ok to avoid email enumeration.
  if (!user || Number(user.email_verified) === 1) {
    return NextResponse.json({ ok: true });
  }

  const rawToken = createAuthToken(user.id, "verify_email", 60 * 24);
  const sent = await sendVerificationEmail(normalizedEmail, rawToken);
  const payload = { ok: true };
  if (sent.mocked && process.env.NODE_ENV !== "production") {
    payload.devVerifyLink = sent.link;
  }
  return NextResponse.json(payload);
}
