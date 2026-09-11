import crypto from "node:crypto";
import { getDb } from "./db";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a one-time auth token (email verify or password reset).
 * Returns the raw token to put in the email link — only the hash is stored.
 */
export function createAuthToken(userId, purpose, ttlMinutes = 60) {
  const db = getDb();
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  // Invalidate prior unused tokens of the same purpose for this user.
  db.prepare(
    `UPDATE auth_tokens SET used_at = datetime('now')
     WHERE user_id = ? AND purpose = ? AND used_at IS NULL`
  ).run(userId, purpose);

  db.prepare(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(userId, tokenHash, purpose, expiresAt);

  return raw;
}

/**
 * Consume a one-time token. Returns { userId } or null if invalid/expired/used.
 */
export function consumeAuthToken(raw, purpose) {
  if (!raw || typeof raw !== "string") return null;
  const db = getDb();
  const tokenHash = hashToken(raw.trim());
  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, used_at FROM auth_tokens
       WHERE token_hash = ? AND purpose = ?`
    )
    .get(tokenHash, purpose);

  if (!row || row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  db.prepare(`UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?`).run(row.id);
  return { userId: row.user_id };
}
