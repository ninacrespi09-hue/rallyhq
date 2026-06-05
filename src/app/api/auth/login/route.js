import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, normalizeEmail, isValidEmail } from "@/lib/auth";
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
  return NextResponse.json({ ok: true });
}
