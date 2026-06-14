// Keep one login email; remove all other user accounts.
// Run: node scripts/reset-users.mjs [email-to-keep]
import { getDb } from "../src/lib/db.js";

const KEEP_EMAIL = (process.argv[2] || "nina.crespi09@gmail.com").trim().toLowerCase();

const db = getDb();
const keep = db.prepare("SELECT id, email, name FROM users WHERE lower(email) = ?").get(KEEP_EMAIL);

if (!keep) {
  console.error(`❌ No user found with email: ${KEEP_EMAIL}`);
  process.exit(1);
}

const others = db
  .prepare("SELECT id, email, name FROM users WHERE lower(email) != ?")
  .all(KEEP_EMAIL);

if (others.length === 0) {
  console.log(`✅ Only ${KEEP_EMAIL} exists — nothing to remove.`);
  process.exit(0);
}

const ids = others.map((u) => u.id);
const ph = ids.map(() => "?").join(",");

const tx = db.transaction(() => {
  // Reassign rows that reference users without ON DELETE CASCADE.
  const reassign = [
    ["events", "created_by"],
    ["announcements", "author_id"],
    ["exercises", "created_by"],
    ["chat_rooms", "created_by"],
    ["player_notes", "author_id"],
    ["player_stats", "recorded_by"],
    ["polls", "author_id"],
  ];
  for (const [table, col] of reassign) {
    const has = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
    if (has) {
      db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} IN (${ph})`).run(keep.id, ...ids);
    }
  }

  db.prepare(`DELETE FROM ai_insights WHERE user_id IN (${ph})`).run(...ids);
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids);
});

tx();

console.log(`✅ Kept: ${keep.email} (${keep.name}, id ${keep.id})`);
console.log(`🗑️  Removed ${others.length} accounts:`);
for (const u of others) console.log(`   - ${u.email} (${u.name})`);
