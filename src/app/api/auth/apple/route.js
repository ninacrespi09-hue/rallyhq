import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { appleAuthUrl, oauthConfigured } from "@/lib/oauth";
import { getAppUrl } from "@/lib/appUrl";

export async function GET() {
  if (!oauthConfigured("apple")) {
    return NextResponse.redirect(
      `${getAppUrl()}/login?oauthError=${encodeURIComponent("Apple sign-in is not configured yet.")}`
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(appleAuthUrl(state));
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
