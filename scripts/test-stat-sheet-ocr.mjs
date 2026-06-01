#!/usr/bin/env node
/**
 * Quick OCR test against a stat sheet image (no UI).
 * Usage: node scripts/test-stat-sheet-ocr.mjs [path-to-image]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register ts path alias workaround — import via dynamic path
const projectRoot = path.join(__dirname, "..");

async function main() {
  const imagePath =
    process.argv[2] ||
    "/Users/ninacrespi/Downloads/ChatGPT Image Jun 1, 2026 at 06_05_36 PM.png";

  if (!fs.existsSync(imagePath)) {
    console.error("Image not found:", imagePath);
    process.exit(1);
  }

  process.chdir(projectRoot);
  const { ocrStatSheet, parseStatSheetText, countFilledStats } = await import("../src/lib/statSheetOcr.js");

  const roster = [
    { id: 1, name: "Emma Wilson", jersey_number: 7 },
    { id: 2, name: "Sophia Chen", jersey_number: 12 },
    { id: 3, name: "Mia Rodriguez", jersey_number: 8 },
    { id: 4, name: "Ava Thompson", jersey_number: 4 },
    { id: 5, name: "Lily Anderson", jersey_number: 15 },
    { id: 6, name: "Isabella Martin", jersey_number: 2 },
    { id: 7, name: "Harper Lee", jersey_number: 10 },
    { id: 8, name: "Charlotte Davis", jersey_number: 3 },
    { id: 9, name: "Amelia Garcia", jersey_number: 9 },
    { id: 10, name: "Evelyn Baker", jersey_number: 11 },
    { id: 11, name: "Abigail Clark", jersey_number: 6 },
  ];

  const buf = fs.readFileSync(imagePath);
  const log = (step, status, detail) => console.log(`[${step}] ${status}${detail ? ` — ${detail}` : ""}`);

  console.log("Scanning:", imagePath);
  const text = await ocrStatSheet(buf, log);
  const parsed = parseStatSheetText(text, roster, log);

  console.log("\n=== MATCH ===");
  console.log(JSON.stringify(parsed.match, null, 2));

  console.log("\n=== PLAYERS ===");
  for (const p of parsed.players) {
    if (!countFilledStats([p])) continue;
    console.log(
      `#${p.jersey_number} ${p.name}: K${p.kills} H${p.hits} B${p.blocks} D${p.digs} A${p.aces} R${p.service_receptions} E${p.hitting_errors}`
    );
  }

  console.log(`\nFilled: ${countFilledStats(parsed.players)} / ${parsed.players.length} players`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
