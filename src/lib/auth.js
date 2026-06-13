import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";

const COOKIE = "rallyhq_session";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
};
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Lowercase and trim an email address for storage and lookup. */
export function normalizeEmail(email) {
  return (email || "").toLowerCase().trim();
}

/** Basic check that the user entered a real-looking email address. */
export function isValidEmail(email) {
  const e = normalizeEmail(email);
  return e.length >= 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Create a signed session cookie for the given user id (persists until logout). */
export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    ...COOKIE_OPTS,
    // ~10 years — stays logged in on this device until sign out
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

/** Clear the session cookie so the user can sign in again with the same email. */
export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
}

/** Returns the logged-in user row (without password) or null. */
export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const db = getDb();
    const user = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.role, u.team_id, u.position, u.jersey_number, u.height_cm, u.bio,
                t.name AS team_name, t.code AS team_code, COALESCE(t.sport, 'volleyball') AS team_sport
         FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
      )
      .get(payload.uid);
    return user || null;
  } catch {
    return null;
  }
}

/** For API routes / pages: throws-style helper returning user or null. */
export async function requireUser() {
  return getCurrentUser();
}
