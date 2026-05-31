// Reset a user's password locally. Usage:
//   node scripts/reset-password.mjs you@email.com newpassword
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const email = (process.argv[2] || "").toLowerCase().trim();
const password = process.argv[3] || "";

if (!email || !password) {
  console.error("Usage: node scripts/reset-password.mjs you@email.com newpassword");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const db = getDb();
const user = db.prepare("SELECT id, name, email FROM users WHERE email = ?").get(email);
if (!user) {
  console.error(`No account found for ${email}`);
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
console.log(`Password updated for ${user.name} (${user.email})`);
