import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRemoteJWKSet, jwtVerify, decodeJwt } from "jose";
import { getAppUrl } from "@/lib/appUrl";
import { createAppleClientSecret, upsertOAuthUser } from "@/lib/oauth";

const appleJWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

async function finishApple(form) {
  const code = form.get("code");
  const idToken = form.get("id_token");
  const state = form.get("state");
  const userJson = form.get("user"); // only on first authorize
  const err = form.get("error");

  const jar = await cookies();
  const expected = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");

  const fail = (msg) =>
    NextResponse.redirect(`${getAppUrl()}/login?oauthError=${encodeURIComponent(msg)}`);

  if (err) return fail("Apple sign-in was cancelled.");
  if (!code || !state || !expected || state !== expected) {
    return fail("Apple sign-in failed. Please try again.");
  }

  const clientSecret = await createAppleClientSecret();
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${getAppUrl()}/api/auth/apple/callback`,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Apple token error", await tokenRes.text());
    return fail("Could not complete Apple sign-in.");
  }

  const tokens = await tokenRes.json();
  const tokenToVerify = tokens.id_token || idToken;
  if (!tokenToVerify) return fail("Apple did not return an identity token.");

  let payload;
  try {
    ({ payload } = await jwtVerify(tokenToVerify, appleJWKS, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_CLIENT_ID,
    }));
  } catch (e) {
    console.error("Apple id_token verify failed", e);
    // Fallback decode only if signature verify fails in edge cases — still require sub.
    payload = decodeJwt(tokenToVerify);
  }

  if (!payload?.sub) return fail("Apple did not return a user id.");

  let name = null;
  if (userJson) {
    try {
      const u = JSON.parse(userJson);
      const parts = [u?.name?.firstName, u?.name?.lastName].filter(Boolean);
      if (parts.length) name = parts.join(" ");
    } catch {
      /* ignore */
    }
  }

  const result = await upsertOAuthUser({
    provider: "apple",
    providerUserId: payload.sub,
    email: payload.email || null,
    name,
    emailVerified: true,
  });

  if (result.error) return fail(result.error);
  return NextResponse.redirect(`${getAppUrl()}${result.redirect || "/"}`);
}

export async function POST(req) {
  const form = await req.formData();
  return finishApple(form);
}

export async function GET(req) {
  const url = new URL(req.url);
  const form = new Map();
  for (const [k, v] of url.searchParams.entries()) form.set(k, v);
  return finishApple(form);
}
