// Remove all real accounts; keep @rallyhq.dev demo players with password password123.
// Run: npm run reset:accounts
import bcrypt from "bcryptjs";
import { execSync } from "node:child_process";
import { getDb } from "../src/lib/db.js";

const DEMO_EMAIL_SUFFIX = "@rallyhq.dev";
const DEMO_PASSWORD = "password123";
const OWNER_EMAIL = "nina.crespi09@gmail.com";

const db = getDb();

const toRemove = db
  .prepare(
    `SELECT id, email, name, role FROM users
     WHERE lower(email) != ?
       AND (role IN ('coach', 'parent')
            OR (role = 'player' AND lower(email) NOT LIKE '%' || ?))`
  )
  .all(OWNER_EMAIL, DEMO_EMAIL_SUFFIX);

if (toRemove.length === 0) {
  console.log("✅ No non-demo accounts to remove.");
} else {
  const ids = toRemove.map((u) => u.id);
  const ph = ids.map(() => "?").join(",");
  const fallback = db
    .prepare(`SELECT id FROM users WHERE role = 'player' AND lower(email) LIKE '%' || ? LIMIT 1`)
    .get(DEMO_EMAIL_SUFFIX);

  if (!fallback) {
    console.error("❌ No demo players found — run npm run seed:all first.");
    process.exit(1);
  }

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
        db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} IN (${ph})`).run(fallback.id, ...ids);
      }
    }
    db.prepare(`DELETE FROM user_sport_teams WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM ai_insights WHERE user_id IN (${ph})`).run(...ids);
    db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids);
  });

  tx();

  console.log(`🗑️  Removed ${toRemove.length} account(s):`);
  for (const u of toRemove) console.log(`   - ${u.email} (${u.name}, ${u.role})`);
}

const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
const resetPw = db
  .prepare(`UPDATE users SET password_hash = ? WHERE role = 'player' AND lower(email) LIKE '%' || ?`)
  .run(hash, DEMO_EMAIL_SUFFIX);

console.log(`🔑 Reset ${resetPw.changes} demo player password(s) to: ${DEMO_PASSWORD}`);

console.log("Ensuring example rosters for all sports...");
execSync("node scripts/seed-all-sports.mjs", { stdio: "inherit" });

const demoCount = db
  .prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'player' AND lower(email) LIKE '%' || ?`)
  .get(DEMO_EMAIL_SUFFIX).c;

console.log(`✅ Demo players ready: ${demoCount}`);

execSync("node scripts/ensure-owner.mjs", { stdio: "inherit" });

console.log("✅ Demo players log in with password123");
