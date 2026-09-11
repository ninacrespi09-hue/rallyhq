import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { consumeAuthToken } from "@/lib/authTokens";

export async function POST(req) {
  const { token, password: rawPassword } = await req.json();
  const password = (rawPassword || "").trim();

  if (!token) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const result = consumeAuthToken(token, "reset_password");
  if (!result) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one.", code: "INVALID_TOKEN" },
      { status: 400 }
    );
  }

  const hash = await hashPassword(password);
  getDb()
    .prepare("UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?")
    .run(hash, result.userId);

  return NextResponse.json({ ok: true, redirect: "/login?reset=1" });
}
