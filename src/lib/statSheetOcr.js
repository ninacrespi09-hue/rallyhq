import Tesseract from "tesseract.js";
import { SCAN_STEPS, withTimeout } from "./statSheetLog";

const SHEET_FIELDS = [
  "aces",
  "service_errors",
  "kills",
  "hitting_errors",
  "assists",
  "digs",
  "blocks",
  "service_receptions",
  "hits",
];

const HEADER_ALIASES = [
  { keys: ["ace", "aces"], field: "aces" },
  { keys: ["service err", "srv err", "se", "service e"], field: "service_errors" },
  { keys: ["kill", "k"], field: "kills" },
  { keys: ["hit err", "he", "attack err", "hitting err"], field: "hitting_errors" },
  { keys: ["assist", "ast", "a"], field: "assists" },
  { keys: ["dig", "d"], field: "digs" },
  { keys: ["block", "blk", "b"], field: "blocks" },
  { keys: ["pass", "pass rtg", "pass rating", "avg pass", "reception", "serve rec"], field: "service_receptions" },
  { keys: ["hit", "att", "attack", "attempt"], field: "hits" },
];

const OCR_TIMEOUT_MS = 25000;

function blankPlayer() {
  return {
    name: "",
    jersey_number: "",
    user_id: null,
    aces: "",
    service_errors: "",
    kills: "",
    hitting_errors: "",
    assists: "",
    digs: "",
    blocks: "",
    service_receptions: "",
    hits: "",
  };
}

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumStr(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.max(0, n)) : "";
}

function toPassRating(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

export function rowHasStats(row) {
  return SHEET_FIELDS.some((f) => row[f] !== "" && row[f] != null);
}

/** Run OCR on the stat sheet image and return raw text. Times out after 25s. */
export async function ocrStatSheet(buffer, log) {
  log?.(SCAN_STEPS.OCR_EXTRACTION, "start", `buffer ${buffer.length} bytes`);

  let worker;
  try {
    worker = await withTimeout(
      Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            log?.(SCAN_STEPS.OCR_EXTRACTION, "progress", `${Math.round(m.progress * 100)}%`);
          }
        },
      }),
      OCR_TIMEOUT_MS,
      SCAN_STEPS.OCR_EXTRACTION
    );

    const result = await withTimeout(
      worker.recognize(buffer),
      OCR_TIMEOUT_MS,
      SCAN_STEPS.OCR_EXTRACTION
    );

    const text = result.data.text || "";
    log?.(SCAN_STEPS.OCR_EXTRACTION, "done", `${text.length} chars extracted`);
    return text;
  } catch (err) {
    log?.(SCAN_STEPS.OCR_EXTRACTION, "error", err.message);
    throw err;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* ignore terminate errors */
      }
    }
  }
}

function parseMatchInfo(text) {
  const match = {
    date: "",
    opponent: "",
    set_scores: [],
    our_score: "",
    opp_score: "",
  };

  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const us = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (iso) {
    match.date = iso[1];
  } else if (us) {
    const year = us[3].length === 2 ? `20${us[3]}` : us[3];
    match.date = `${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  const opp =
    text.match(/(?:vs\.?|opponent)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9\s.'-]{2,40})/i) ||
    text.match(/(?:played|@)\s+([A-Za-z0-9][A-Za-z0-9\s.'-]{2,40})/i);
  if (opp) match.opponent = opp[1].trim().split(/\n/)[0].trim();

  const setScores = [];
  for (const m of text.matchAll(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a <= 35 && b <= 35 && (a >= 15 || b >= 15)) setScores.push(`${a}-${b}`);
  }
  match.set_scores = [...new Set(setScores)].slice(0, 5);

  if (match.set_scores.length) {
    let ours = 0;
    let oppSets = 0;
    for (const set of match.set_scores) {
      const [a, b] = set.split("-").map(Number);
      if (a > b) ours += 1;
      else if (b > a) oppSets += 1;
    }
    match.our_score = ours ? String(ours) : "";
    match.opp_score = oppSets ? String(oppSets) : "";
  }

  return match;
}

function detectColumns(headerLine) {
  const lower = headerLine.toLowerCase();
  const columns = [];
  for (const alias of HEADER_ALIASES) {
    let bestIdx = -1;
    for (const key of alias.keys) {
      const idx = lower.indexOf(key);
      if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx;
    }
    if (bestIdx >= 0) columns.push({ field: alias.field, idx: bestIdx });
  }
  columns.sort((a, b) => a.idx - b.idx);
  return columns;
}

function findPlayerLine(lines, player) {
  const jersey = player.jersey_number != null ? String(player.jersey_number) : "";
  const lastName = normName(player.name).split(" ").pop();

  for (const line of lines) {
    if (jersey && new RegExp(`\\b#?${jersey}\\b`).test(line)) return line;
  }
  for (const line of lines) {
    const n = normName(line);
    if (normName(player.name) && n.includes(normName(player.name))) return line;
    if (lastName && lastName.length > 2 && n.includes(lastName)) return line;
  }
  return null;
}

function extractNumbers(line) {
  const nums = [];
  for (const m of line.matchAll(/(\d+(?:\.\d+)?)/g)) {
    nums.push(m[1]);
  }
  return nums;
}

function mapNumbersToFields(nums, columns) {
  const row = blankPlayer();
  if (!nums.length) return row;

  if (columns.length >= 3) {
    const numericFields = columns.map((c) => c.field);
    const start = Math.max(0, nums.length - numericFields.length);
    numericFields.forEach((field, i) => {
      const val = nums[start + i];
      if (val == null) return;
      row[field] = field === "service_receptions" ? toNumStr(val) : toNumStr(val);
    });
    return row;
  }

  const order = ["aces", "service_errors", "kills", "hitting_errors", "assists", "digs", "blocks", "service_receptions"];
  const slice = nums.slice(-order.length);
  order.forEach((field, i) => {
    const val = slice[i];
    if (val == null) return;
    row[field] = field === "pass_rating" ? toPassRating(val) : toNumStr(val);
  });
  return row;
}

/** Parse OCR text into stat rows using roster names and table heuristics. */
export function parseStatSheetText(text, roster, log) {
  log?.(SCAN_STEPS.STAT_PARSING, "start", `${text.length} chars, ${roster.length} roster players`);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const match = parseMatchInfo(text);
  const headerLine = lines.find((l) => /ace|kill|dig|assist|block|pass/i.test(l) && !/\d/.test(l));
  const columns = headerLine ? detectColumns(headerLine) : [];

  const players = roster.map((r) => {
    const base = {
      ...blankPlayer(),
      name: r.name,
      jersey_number: r.jersey_number != null ? String(r.jersey_number) : "",
      user_id: r.id,
    };

    const line = findPlayerLine(lines, r);
    if (!line) return base;

    const nums = extractNumbers(line);
    const jerseyIdx = base.jersey_number ? nums.findIndex((n) => n === base.jersey_number) : -1;
    const statNums = jerseyIdx >= 0 ? nums.slice(jerseyIdx + 1) : nums.slice(1);
    const mapped = mapNumbersToFields(statNums.length ? statNums : nums, columns);

    return { ...base, ...mapped };
  });

  const filled = players.filter((p) => rowHasStats(p)).length;
  log?.(SCAN_STEPS.STAT_PARSING, "done", `${filled} players with stats`);

  return { match, players };
}

/** OCR + text parse pipeline. */
export async function parseStatSheetWithOcr({ buffer, roster, log }) {
  const text = await ocrStatSheet(buffer, log);
  const parsed = parseStatSheetText(text, roster, log);
  return {
    ...parsed,
    ocrText: text.slice(0, 500),
  };
}

export function countFilledStats(players) {
  return players.filter((p) => rowHasStats(p)).length;
}
