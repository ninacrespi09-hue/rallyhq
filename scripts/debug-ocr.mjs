#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const imagePath =
  process.argv[2] ||
  "/Users/ninacrespi/Downloads/ChatGPT Image Jun 1, 2026 at 06_05_36 PM.png";

process.chdir(projectRoot);

const { parseStatSheetWithOcr, debugStatSheetParse, countFilledStats } = await import(
  "../src/lib/statSheetOcr.js"
);

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
const result = await parseStatSheetWithOcr({ buffer: buf, roster, log });
const debug = debugStatSheetParse(result.ocrText, roster);

console.log("\n========== 1. RAW OCR TEXT ==========\n");
console.log(result.ocrText);

console.log("\n========== 2. PARSED FIELDS ==========\n");
console.log("Match:", JSON.stringify(result.match, null, 2));
console.log("Header:", debug.headerLine || "(none)");
console.log("Columns:", debug.columns.join(", ") || "(default)");
console.log("Team totals row:", debug.teamTotals);
console.log("Team statistics block:", debug.teamBlock);
console.log(`Table rows parsed: ${debug.tableRows.length}`);

console.log("\n========== 3. FAILED DETECTIONS ==========\n");
if (debug.failures.length === 0) {
  console.log("(none)");
} else {
  for (const f of debug.failures) {
    console.log(`- ${f.field}: got ${JSON.stringify(f.got)}, expected ${JSON.stringify(f.expected)}`);
  }
}

console.log("\n========== 4. PLAYERS WITH STATS ==========\n");
for (const p of result.players) {
  if (!countFilledStats([p])) continue;
  console.log(
    `#${p.jersey_number} ${p.name}: K=${p.kills} H=${p.hits} B=${p.blocks} D=${p.digs} A=${p.aces} SR=${p.service_receptions} E=${p.hitting_errors}`
  );
}
console.log(`\nFilled: ${countFilledStats(result.players)} / ${result.players.length}`);
