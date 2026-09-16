// Ensure Nina's coach login exists. Never overwrite an existing password,
// and never delete other real accounts (use RESET_ACCOUNTS=1 / reset:accounts for that).
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const OWNER_EMAIL = "nina.crespi09@gmail.com";
const OWNER_PASSWORD = "Spain2025!";
const OWNER_NAME = "Nina Crespi";
const OWNER_TEAM_CODE = "073009";
const OWNER_TEAM_NAME = "Barcelona Wave";

const db = getDb();

// Make sure the real club team exists (not the DEMO01 example roster).
let teamId = db.prepare("SELECT id FROM teams WHERE code = ?").get(OWNER_TEAM_CODE)?.id;
if (!teamId) {
  teamId = db
    .prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)")
    .run(OWNER_TEAM_NAME, OWNER_TEAM_CODE, "volleyball").lastInsertRowid;
}

let owner = db.prepare("SELECT id, email FROM users WHERE lower(email) = ?").get(OWNER_EMAIL);

if (!owner) {
  const hash = bcrypt.hashSync(OWNER_PASSWORD, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, team_id, sport_preference, email_verified)
       VALUES (?, ?, ?, 'coach', ?, 'all', 1)`
    )
    .run(OWNER_NAME, OWNER_EMAIL, hash, teamId);
  owner = { id: info.lastInsertRowid, email: OWNER_EMAIL };
  console.log(`✅ Created owner login: ${OWNER_EMAIL}`);
} else {
  // Keep the owner's chosen password. Point them at the real club team every boot
  // so demo seeding cannot leave them stuck on DEMO01.
  db.prepare(
    `UPDATE users SET role = 'coach', sport_preference = 'all', email_verified = 1, team_id = ? WHERE id = ?`
  ).run(teamId, owner.id);
  console.log(`✅ Owner account ready (password unchanged): ${OWNER_EMAIL}`);
}

// Always restore volleyball → Barcelona Wave (overwrite demo link if seed ran first).
db.prepare(
  `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'volleyball', ?)
   ON CONFLICT(user_id, sport) DO UPDATE SET team_id = excluded.team_id`
).run(owner.id, teamId);

console.log(`✅ Owner login: ${OWNER_EMAIL} → team ${OWNER_TEAM_CODE}`);
