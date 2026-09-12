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

  console.info("[auth-resend] resending verification email", {
    userId: user.id,
    email: normalizedEmail,
  });

  const rawToken = createAuthToken(user.id, "verify_email", 60 * 24);
  const sent = await sendVerificationEmail(normalizedEmail, rawToken);

  // In production, never pretend the email was sent if Resend isn't configured or failed.
  if (sent.mocked && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Email delivery is not configured on the server (missing RESEND_API_KEY). Add it in Render Environment, then try again.",
        code: "EMAIL_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }
  if (!sent.ok) {
    return NextResponse.json(
      { error: sent.error || "Failed to send verification email.", code: "EMAIL_SEND_FAILED" },
      { status: 502 }
    );
  }

  const payload = { ok: true };
  if (sent.mocked && process.env.NODE_ENV !== "production") {
    payload.devVerifyLink = sent.link;
  }
  return NextResponse.json(payload);
}
