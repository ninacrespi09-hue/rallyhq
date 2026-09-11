// Ensure Nina's coach login exists. Never overwrite an existing password,
// and never delete other real accounts (use RESET_ACCOUNTS=1 / reset:accounts for that).
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const OWNER_EMAIL = "nina.crespi09@gmail.com";
const OWNER_PASSWORD = "Spain2025!";
const OWNER_NAME = "Nina Crespi";

const db = getDb();

let owner = db.prepare("SELECT id, email FROM users WHERE lower(email) = ?").get(OWNER_EMAIL);

if (!owner) {
  const hash = bcrypt.hashSync(OWNER_PASSWORD, 10);
  let teamId = db.prepare("SELECT id FROM teams WHERE code = ?").get("073009")?.id;
  if (!teamId) {
    teamId = db
      .prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)")
      .run("Barcelona Wave", "073009", "volleyball").lastInsertRowid;
  }
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, team_id, sport_preference, email_verified)
       VALUES (?, ?, ?, 'coach', ?, 'all', 1)`
    )
    .run(OWNER_NAME, OWNER_EMAIL, hash, teamId);
  owner = { id: info.lastInsertRowid, email: OWNER_EMAIL };
  db.prepare(
    `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'volleyball', ?)
     ON CONFLICT(user_id, sport) DO NOTHING`
  ).run(owner.id, teamId);
  console.log(`✅ Created owner login: ${OWNER_EMAIL}`);
} else {
  // Keep the owner's chosen password. Only refresh role / preference / verified flags.
  db.prepare(
    `UPDATE users SET role = 'coach', sport_preference = 'all', email_verified = 1 WHERE id = ?`
  ).run(owner.id);
  console.log(`✅ Owner account ready (password unchanged): ${OWNER_EMAIL}`);
}

console.log(`✅ Owner login: ${OWNER_EMAIL}`);
