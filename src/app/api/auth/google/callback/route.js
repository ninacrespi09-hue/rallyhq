import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/appUrl";
import { upsertOAuthUser } from "@/lib/oauth";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");

  const fail = (msg) =>
    NextResponse.redirect(`${getAppUrl()}/login?oauthError=${encodeURIComponent(msg)}`);

  if (err) return fail("Google sign-in was cancelled.");
  if (!code || !state || !expected || state !== expected) {
    return fail("Google sign-in failed. Please try again.");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${getAppUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Google token error", await tokenRes.text());
    return fail("Could not complete Google sign-in.");
  }

  const tokens = await tokenRes.json();
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) {
    return fail("Could not load your Google profile.");
  }

  const profile = await profileRes.json();
  if (!profile.sub) return fail("Google did not return a user id.");

  const result = await upsertOAuthUser({
    provider: "google",
    providerUserId: profile.sub,
    email: profile.email,
    name: profile.name,
    emailVerified: Boolean(profile.email_verified),
  });

  if (result.error) return fail(result.error);
  return NextResponse.redirect(`${getAppUrl()}${result.redirect || "/"}`);
}
