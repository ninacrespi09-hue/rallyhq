import crypto from "node:crypto";
import { getDb } from "./db";

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function normalizeEmail(email) {
  return (email || "").toLowerCase().trim();
}

/**
 * Create a one-time auth token (email verify or password reset).
 * Verify emails use a 6-digit code hashed with the user's email so codes are
 * per-account (avoids global UNIQUE collisions on 6 digits).
 */
export function createAuthToken(userId, purpose, ttlMinutes = 60) {
  const db = getDb();
  let raw;
  let tokenHash;

  if (purpose === "verify_email") {
    const email = db.prepare("SELECT email FROM users WHERE id = ?").get(userId)?.email;
    if (!email) throw new Error("Cannot create verify token without user email");
    // Retry if this hash somehow already exists (used codes still occupy UNIQUE).
    for (let attempt = 0; attempt < 12; attempt++) {
      raw = String(crypto.randomInt(100000, 999999));
      tokenHash = hashToken(`verify_email:${normalizeEmail(email)}:${raw}`);
      const clash = db.prepare("SELECT 1 FROM auth_tokens WHERE token_hash = ?").get(tokenHash);
      if (!clash) break;
      if (attempt === 11) throw new Error("Could not allocate a unique verification code");
    }
  } else {
    raw = crypto.randomBytes(32).toString("hex");
    tokenHash = hashToken(`reset_password:${raw}`);
  }

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

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
 * Consume a one-time token. For verify_email, pass the account email so the
 * 6-digit code can be matched (codes are hashed with email).
 * Returns { userId } or null.
 */
export function consumeAuthToken(raw, purpose, email) {
  // Coerce numbers from JSON so typeof checks don't reject valid codes.
  const normalized = String(raw ?? "")
    .trim()
    .replace(/\s+/g, "");
  if (!normalized) {
    console.warn("[auth-token] empty token", { purpose });
    return null;
  }

  const db = getDb();
  const candidates = [];
  if (purpose === "verify_email" && email) {
    candidates.push(hashToken(`verify_email:${normalizeEmail(email)}:${normalized}`));
  }
  // Legacy fallbacks from earlier deployments (raw hash / purpose-prefixed without email).
  candidates.push(hashToken(normalized));
  candidates.push(hashToken(`${purpose}:${normalized}`));

  let row = null;
  for (const tokenHash of candidates) {
    row = db
      .prepare(
        `SELECT id, user_id, expires_at, used_at FROM auth_tokens
         WHERE token_hash = ? AND purpose = ?`
      )
      .get(tokenHash, purpose);
    if (row) break;
  }

  if (!row) {
    console.warn("[auth-token] not found", {
      purpose,
      hasEmail: Boolean(email),
      tokenLength: normalized.length,
    });
    return null;
  }

  if (row.used_at) {
    // Idempotent verify: code was already consumed (e.g. email-link prefetch) but
    // the account is verified — treat as success so the user can continue.
    if (purpose === "verify_email") {
      const user = db
        .prepare("SELECT id, email_verified FROM users WHERE id = ?")
        .get(row.user_id);
      if (user && Number(user.email_verified) === 1) {
        console.info("[auth-token] already used but account verified — idempotent OK", {
          userId: row.user_id,
        });
        return { userId: row.user_id, alreadyVerified: true };
      }
    }
    console.warn("[auth-token] already used", { purpose, userId: row.user_id });
    return null;
  }

  const expiresMs = Date.parse(row.expires_at);
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
