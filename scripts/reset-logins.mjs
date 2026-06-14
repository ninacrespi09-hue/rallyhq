// Remove all coach/parent login accounts so you can sign up fresh.
// Demo roster players (@rallyhq.dev) are kept.
// Run: node scripts/reset-logins.mjs
import { getDb } from "../src/lib/db.js";

const db = getDb();
const logins = db
  .prepare("SELECT id, email, name, role FROM users WHERE role IN ('coach', 'parent')")
  .all();

if (logins.length === 0) {
  console.log("✅ No coach/parent logins to remove — you can sign up now.");
  process.exit(0);
}

const ids = logins.map((u) => u.id);
const ph = ids.map(() => "?").join(",");
const fallback = db
  .prepare("SELECT id FROM users WHERE role = 'player' ORDER BY id LIMIT 1")
  .get();

if (!fallback) {
  console.error("❌ No demo players found to reassign coach-owned content.");
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
  db.prepare(`DELETE FROM ai_insights WHERE user_id IN (${ph})`).run(...ids);
  db.prepare(`DELETE FROM users WHERE id IN (${ph})`).run(...ids);
});

tx();

console.log(`🗑️  Removed ${logins.length} login account(s):`);
for (const u of logins) console.log(`   - ${u.email} (${u.name}, ${u.role})`);
console.log(`✅ Demo players kept: ${db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'player'").get().c}`);
console.log("✅ You can now sign up with a fresh account.");
