import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { googleAuthUrl, oauthConfigured } from "@/lib/oauth";
import { getAppUrl } from "@/lib/appUrl";

export async function GET() {
  if (!oauthConfigured("google")) {
    return NextResponse.redirect(
      `${getAppUrl()}/login?oauthError=${encodeURIComponent("Google sign-in is not configured yet.")}`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
