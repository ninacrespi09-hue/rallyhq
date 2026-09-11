import crypto from "node:crypto";
import { getDb } from "./db";
import { hashPassword, normalizeEmail, createSession } from "./auth";
import { homePathForUser } from "./userSportPreference";
import { getAppUrl } from "./appUrl";

/** Unusable password hash for OAuth-only accounts (never store plaintext). */
export async function oauthPasswordPlaceholder() {
  return hashPassword(`oauth:${crypto.randomBytes(32).toString("hex")}`);
}

/**
 * Find or create a user for an OAuth provider and start a session.
 * Same Google/Apple id (or matching verified email) always maps to the same user.
 */
export async function upsertOAuthUser({
  provider,
  providerUserId,
  email,
  name,
  emailVerified = true,
}) {
  const db = getDb();
  const idCol = provider === "google" ? "google_id" : "apple_id";
  const normalized = email ? normalizeEmail(email) : null;

  let user = db.prepare(`SELECT * FROM users WHERE ${idCol} = ?`).get(providerUserId);

  if (!user && normalized) {
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized);
    if (user) {
      db.prepare(`UPDATE users SET ${idCol} = ?, email_verified = 1 WHERE id = ?`).run(
        providerUserId,
        user.id
      );
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }
  }

  if (!user) {
    if (!normalized) {
      return { error: "Your account did not share an email address. Try again or use email signup." };
    }
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
    if (exists) {
      return { error: "An account with that email already exists. Sign in with email, then link Google/Apple later." };
    }
    const hash = await oauthPasswordPlaceholder();
    const displayName = (name || normalized.split("@")[0] || "Athlete").trim().slice(0, 80);
    const info = db
      .prepare(
        `INSERT INTO users (name, email, password_hash, role, team_id, sport_preference, email_verified, ${idCol})
         VALUES (?, ?, ?, 'player', NULL, 'volleyball', 1, ?)`
      )
      .run(displayName, normalized, hash, providerUserId);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  } else if (emailVerified) {
    db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(user.id);
  }

  await createSession(user.id);

  const profile = db
    .prepare(
      `SELECT u.id, u.role, COALESCE(u.sport_preference, t.sport, 'volleyball') AS sport_preference,
              COALESCE(t.sport, 'volleyball') AS team_sport
       FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
    )
    .get(user.id);

  return { ok: true, redirect: homePathForUser(profile) };
}

export function oauthConfigured(provider) {
  if (provider === "google") {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  if (provider === "apple") {
    return Boolean(
      process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY
    );
  }
  return false;
}

export function googleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${getAppUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function appleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    redirect_uri: `${getAppUrl()}/api/auth/apple/callback`,
    response_type: "code id_token",
    response_mode: "form_post",
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

/** Build a short-lived Apple client_secret JWT (ES256). */
export async function createAppleClientSecret() {
  const { SignJWT, importPKCS8 } = await import("jose");
  let keyPem = process.env.APPLE_PRIVATE_KEY || "";
  // Support env values with literal \n
  keyPem = keyPem.replace(/\\n/g, "\n");
  if (!keyPem.includes("BEGIN")) {
    keyPem = `-----BEGIN PRIVATE KEY-----\n${keyPem}\n-----END PRIVATE KEY-----`;
  }
  const key = await importPKCS8(keyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: process.env.APPLE_KEY_ID })
    .setIssuer(process.env.APPLE_TEAM_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24 * 150)
    .setAudience("https://appleid.apple.com")
    .setSubject(process.env.APPLE_CLIENT_ID)
    .sign(key);
}
