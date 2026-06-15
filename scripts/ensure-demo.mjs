// Load demo data when the database is empty; always ensure all-sport rosters exist.
import { execSync } from "node:child_process";
import { getDb } from "../src/lib/db.js";

const db = getDb();
const { c } = db.prepare("SELECT COUNT(*) as c FROM users").get();
if (c === 0) {
  console.log("No users in database — loading demo team...");
  execSync("node scripts/seed.mjs", { stdio: "inherit" });
}

if (process.env.RESET_ACCOUNTS === "1") {
  console.log("RESET_ACCOUNTS=1 — clearing non-demo logins, keeping example players...");
  execSync("node scripts/reset-accounts.mjs", { stdio: "inherit" });
} else {
  console.log("Ensuring example players for volleyball, basketball, and soccer...");
  execSync("node scripts/seed-all-sports.mjs", { stdio: "inherit" });
}

console.log("Ensuring owner login...");
execSync("node scripts/ensure-owner.mjs", { stdio: "inherit" });
