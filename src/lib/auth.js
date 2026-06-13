import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { isSportId } from "./sports";
import { resolveTeamId, SPORT_COOKIE } from "./sportTeams";
import { SPORT_PREF_COOKIE, normalizeSportPreference } from "./userSportPreference";

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
  const pref =
    getDb().prepare("SELECT sport_preference FROM users WHERE id = ?").get(userId)?.sport_preference ||
    "volleyball";
  jar.set(COOKIE, token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
  jar.set(SPORT_PREF_COOKIE, normalizeSportPreference(pref), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

/** Clear the session cookie so the user can sign in again with the same email. */
export async function destroySession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  jar.set(SPORT_PREF_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  jar.set(SPORT_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
}

function applyActiveSportTeam(user, sport) {
  if (!sport || !isSportId(sport)) return user;
  const sportTeamId = resolveTeamId(user, sport);
  if (!sportTeamId) {
    return {
      ...user,
      primary_team_id: user.team_id,
      active_sport: sport,
      team_id: null,
      team_name: null,
      team_code: null,
      team_sport: sport,
    };
  }
  const team = getDb()
    .prepare("SELECT name, code, sport FROM teams WHERE id = ?")
    .get(sportTeamId);
  return {
    ...user,
    primary_team_id: user.team_id,
    active_sport: sport,
    team_id: sportTeamId,
    team_name: team?.name ?? user.team_name,
    team_code: team?.code ?? user.team_code,
    team_sport: team?.sport ?? sport,
  };
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
                COALESCE(u.sport_preference, t.sport, 'volleyball') AS sport_preference,
                t.name AS team_name, t.code AS team_code, COALESCE(t.sport, 'volleyball') AS team_sport
         FROM users u LEFT JOIN teams t ON t.id = u.team_id WHERE u.id = ?`
      )
      .get(payload.uid);
    if (!user) return null;
    const sport = jar.get(SPORT_COOKIE)?.value;
    return applyActiveSportTeam(user, sport);
  } catch {
    return null;
  }
}

/** For API routes / pages: throws-style helper returning user or null. */
export async function requireUser() {
  return getCurrentUser();
}
