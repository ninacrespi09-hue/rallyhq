import crypto from "node:crypto";
import { getDb } from "./db";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a one-time auth token (email verify or password reset).
 * Email verification uses a 6-digit code (easy to type). Password reset stays a long secret.
 * Returns the raw token to put in the email — only the hash is stored.
 */
export function createAuthToken(userId, purpose, ttlMinutes = 60) {
  const db = getDb();
  const raw =
    purpose === "verify_email"
      ? String(crypto.randomInt(100000, 999999))
      : crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  // Store as ISO UTC so expiry checks are timezone-safe.
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

  console.info("[auth-token] created", {
    userId,
    purpose,
    ttlMinutes,
    expiresAt,
    isSixDigitCode: purpose === "verify_email",
  });

  return raw;
}

/**
 * Consume a one-time token. Returns { userId } or null if invalid/expired/used.
 */
export function consumeAuthToken(raw, purpose) {
  if (!raw || typeof raw !== "string") return null;
  const db = getDb();
  // Allow spaces in typed codes ("123 456") and trim paste noise.
  const normalized = raw.trim().replace(/\s+/g, "");
  const tokenHash = hashToken(normalized);
  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, used_at FROM auth_tokens
       WHERE token_hash = ? AND purpose = ?`
    )
    .get(tokenHash, purpose);

  if (!row) {
    console.warn("[auth-token] not found", { purpose });
    return null;
  }
  if (row.used_at) {
    console.warn("[auth-token] already used", { purpose, userId: row.user_id });
    return null;
  }

  const expiresMs = new Date(row.expires_at).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs < Date.now()) {
    console.warn("[auth-token] expired", {
      purpose,
      userId: row.user_id,
      expires_at: row.expires_at,
    });
    return null;
  }

  db.prepare(`UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?`).run(row.id);
  console.info("[auth-token] consumed OK", { purpose, userId: row.user_id });
  return { userId: row.user_id };
}
