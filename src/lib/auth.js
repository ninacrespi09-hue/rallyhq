import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";

const COOKIE = "rallyhq_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-in-production"
);

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Create a signed session cookie for the given user id. */
export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
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
        "SELECT id, name, email, role, position, jersey_number, height_cm, bio FROM users WHERE id = ?"
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
