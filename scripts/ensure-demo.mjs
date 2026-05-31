// Load demo data only when the database is empty (e.g. first Render deploy).
import { execSync } from "node:child_process";
import { getDb } from "../src/lib/db.js";

const { c } = getDb().prepare("SELECT COUNT(*) as c FROM users").get();
if (c === 0) {
  console.log("No users in database — loading demo team...");
  execSync("node scripts/seed.mjs", { stdio: "inherit" });
}
