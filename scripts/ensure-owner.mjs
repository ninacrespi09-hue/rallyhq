// Keep Nina's coach login; remove any other real coach/parent accounts.
// Ensures password is Spain2025 and demo @rallyhq.dev players stay.
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const OWNER_EMAIL = "nina.crespi09@gmail.com";
const OWNER_PASSWORD = "Spain2025";
const OWNER_NAME = "Nina Crespi";
const DEMO_SUFFIX = "@rallyhq.dev";

const db = getDb();
const hash = bcrypt.hashSync(OWNER_PASSWORD, 10);

let owner = db.prepare("SELECT id, email FROM users WHERE lower(email) = ?").get(OWNER_EMAIL);

if (!owner) {
  let teamId = db.prepare("SELECT id FROM teams WHERE code = ?").get("073009")?.id;
  if (!teamId) {
    teamId = db
      .prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)")
      .run("Barcelona Wave", "073009", "volleyball").lastInsertRowid;
  }
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, team_id, sport_preference)
       VALUES (?, ?, ?, 'coach', ?, 'all')`
    )
    .run(OWNER_NAME, OWNER_EMAIL, hash, teamId);
  owner = { id: info.lastInsertRowid, email: OWNER_EMAIL };
  db.prepare(
    `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'volleyball', ?)
     ON CONFLICT(user_id, sport) DO NOTHING`
  ).run(owner.id, teamId);
  console.log(`✅ Created owner login: ${OWNER_EMAIL}`);
} else {
  db.prepare("UPDATE users SET password_hash = ?, role = 'coach', sport_preference = 'all' WHERE id = ?").run(
    hash,
    owner.id
  );
  console.log(`✅ Owner password set for ${OWNER_EMAIL}`);
}

const others = db
  .prepare(
    `SELECT id, email, name, role FROM users
     WHERE role IN ('coach', 'parent') AND lower(email) != ?`
  )
  .all(OWNER_EMAIL);

if (others.length > 0) {
  const ids = others.map((u) => u.id);
  const ph = ids.map(() => "?").join(",");
  const reassign = [
    ["events", "created_by"],
    ["announcements", "author_id"],
    ["exercises", "created_by"],
    ["chat_rooms", "created_by"],
    ["player_notes", "author_id"],
    ["player_stats", "recorded_by"],
    ["polls", "author_id"],
    ["media", "uploaded_by"],
    ["wellness_kit_items", "updated_by"],
  ];

  const tx = db.transaction(() => {
    for (const [table, col] of reassign) {
      const has = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
      if (has) {
        db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} IN (${ph})`).run(owner.id, ...ids);
      }
    }
    db.prepare(`DELETE FROM user_sport_teams WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM ai_insights WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids);
  });
  tx();
  console.log(`🗑️  Removed ${others.length} other login account(s).`);
}

const nonDemoPlayers = db
  .prepare(
    `SELECT id, email FROM users WHERE role = 'player' AND lower(email) NOT LIKE '%' || ?`
  )
  .all(DEMO_SUFFIX);

if (nonDemoPlayers.length > 0) {
  const ids = nonDemoPlayers.map((u) => u.id);
  const ph = ids.map(() => "?").join(",");
  db.prepare(`DELETE FROM user_sport_teams WHERE user_id IN (${ph})`).run(...ids);
  db.prepare(`DELETE FROM ai_insights WHERE user_id IN (${ph})`).run(...ids);
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids);
  console.log(`🗑️  Removed ${nonDemoPlayers.length} non-demo player account(s).`);
}

const demoCount = db
  .prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'player' AND lower(email) LIKE '%' || ?`)
  .get(DEMO_SUFFIX).c;

console.log(`✅ Owner login ready: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
console.log(`✅ Demo players kept: ${demoCount}`);
