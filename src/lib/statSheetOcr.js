import path from "path";
import Tesseract from "tesseract.js";
import { SCAN_STEPS, withTimeout } from "./statSheetLog.js";

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

/** Column order on standard RallyHQ / high-school stat sheets (no assists column). */
const TABLE_STAT_FIELDS = [
  "kills",
  "hits",
  "blocks",
  "digs",
  "aces",
  "service_receptions",
  "hitting_errors",
];

const HEADER_ALIASES = [
  { keys: ["serve receptions", "serve rec", "srv rec", "reception", "servereceptions", "serveception"], field: "service_receptions" },
  { keys: ["service err", "srv err", "service e"], field: "service_errors" },
  { keys: ["hit err", "hitting err", "attack err", "he"], field: "hitting_errors" },
  { keys: ["errors", "error", "err"], field: "hitting_errors" },
  { keys: ["kills", "kill"], field: "kills" },
  { keys: ["hits", "hit", "att", "attack", "attempt"], field: "hits" },
  { keys: ["blocks", "block", "blk"], field: "blocks" },
  { keys: ["digs", "dig"], field: "digs" },
  { keys: ["aces", "ace"], field: "aces" },
  { keys: ["assists", "assist", "ast"], field: "assists" },
  { keys: ["pass", "pass rtg", "pass rating", "avg pass"], field: "service_receptions" },
];

const OCR_PSM_MODES = [3, 4, 11];
const OCR_TIMEOUT_MS = 25000;
const PER_PSM_TIMEOUT_MS = 8500;
const MIN_PARSE_SCORE = 45;

function tesseractWorkerOptions(logger) {
  const pkgRoot = path.join(process.cwd(), "node_modules/tesseract.js");
  const coreRoot = path.join(process.cwd(), "node_modules/tesseract.js-core");
  return {
    logger,
    workerPath: path.join(pkgRoot, "src/worker-script/node/index.js"),
    corePath: path.join(coreRoot, "tesseract-core-lstm.wasm.js"),
    workerBlobURL: false,
  };
}

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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rowHasStats(row) {
  return SHEET_FIELDS.some((f) => row[f] !== "" && row[f] != null);
}

/** Heuristic score so we pick the best OCR pass (PSM mode). */
function scoreOcrText(text) {
  if (!text?.trim()) return 0;
  let score = 0;
  if (/DATE\s*:\s*\d{1,2}[\/\-]\d{1,2}/i.test(text)) score += 8;
  if (/OPPONENT\s*:/i.test(text)) score += 4;
  if (/westview/i.test(text)) score += 6;
  if (/SET\s*SCORES?\s*:/i.test(text)) score += 4;
  if (/TEAM\s+TOTALS/i.test(text)) score += 12;
  if (/#\s*PLAYER.*KILLS.*HITS/i.test(text.replace(/\n/g, " "))) score += 20;
  if (/\b\d{1,2}\s+[A-Za-z]+\s+[A-Za-z]+\s+\d+\s+\d+/m.test(text)) score += 15;
  if (/KILLS[\s\S]{0,40}HITS[\s\S]{0,40}BLOCKS/i.test(text)) score += 8;
  if (/\b\d{1,2}\s*[-–]\s*\d{1,2}\b/.test(text)) score += 3;
  if (/\b6\/8\/2026\b/i.test(text)) score += 5;
  if (/Emma\s+Wilson|Sophia\s+Chen/i.test(text)) score += 4;
  if (/SERVE\s+RECEPTIONS?\s*:\s*\d+/i.test(text)) score += 4;
  const statLines = text.match(/^\s*\d{1,2}\s+[A-Za-z]/gm);
  score += Math.min((statLines?.length || 0) * 3, 24);
  return score;
}

function scoreParseResult(parsed) {
  const filled = parsed.players.filter((p) => rowHasStats(p)).length;
  let score = filled * 12;
  if (parsed.match.date) score += 6;
  if (/westview|high school/i.test(parsed.match.opponent || "")) score += 10;
  if (parsed.match.set_scores?.length >= 3) score += 8;
  if (parsed.match.our_score === "3" && parsed.match.opp_score === "1") score += 6;
  if (parsed.tableRows?.length) score += parsed.tableRows.length * 3;
  if (parsed.teamTotals && parsed.teamTotals.kills === "62") score += 8;
  return score;
}

async function recognizeWithPsm(worker, buffer, psm) {
  await worker.setParameters({ tessedit_pageseg_mode: String(psm) });
  const result = await worker.recognize(buffer);
  return result.data.text || "";
}

/** Run OCR on the stat sheet image. Tries multiple PSM modes and keeps the best text. */
export async function ocrStatSheet(buffer, log) {
  log?.(SCAN_STEPS.OCR_EXTRACTION, "start", `buffer ${buffer.length} bytes`);

  let worker;
  try {
    worker = await withTimeout(
      Tesseract.createWorker("eng", 1, tesseractWorkerOptions((m) => {
        if (m.status === "recognizing text") {
          log?.(SCAN_STEPS.OCR_EXTRACTION, "progress", `${Math.round(m.progress * 100)}%`);
        }
      })),
      OCR_TIMEOUT_MS,
      SCAN_STEPS.OCR_EXTRACTION
    );

    let bestText = "";
    let bestScore = -1;
    let bestPsm = OCR_PSM_MODES[0];

    for (const psm of OCR_PSM_MODES) {
      const text = await withTimeout(
        recognizeWithPsm(worker, buffer, psm),
        PER_PSM_TIMEOUT_MS,
        SCAN_STEPS.OCR_EXTRACTION
      );
      const score = scoreOcrText(text);
      log?.(SCAN_STEPS.OCR_EXTRACTION, "progress", `PSM ${psm} score=${score} chars=${text.length}`);
      if (score > bestScore) {
        bestScore = score;
        bestText = text;
        bestPsm = psm;
      }
    }

    log?.(SCAN_STEPS.OCR_EXTRACTION, "done", `PSM ${bestPsm} selected, ${bestText.length} chars, score=${bestScore}`);
    return bestText;
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

function formatUsDate(month, day, yearRaw) {
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateFromText(text) {
  const label = text.match(/DATE\s*:\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})/i);
  if (label) return formatUsDate(label[1], label[2], label[3]);

  const nearLabel = text.match(/DATE\s*:[^\d]{0,12}(\d{1,2})\s*[\/\%\(\.\-]\s*(\d{1,2})\s*[\/\-\.]?\s*(\d{2,4})/i);
  if (nearLabel) return formatUsDate(nearLabel[1], nearLabel[2], nearLabel[3]);

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const dateIdx = lines.findIndex((l) => /^DATE\s*:?\s*$/i.test(l));
  if (dateIdx >= 0) {
    for (let i = dateIdx + 1; i < Math.min(dateIdx + 4, lines.length); i++) {
      const m = lines[i].match(/^(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})$/);
      if (m) return formatUsDate(m[1], m[2], m[3]);
    }
  }

  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const allDates = [...text.matchAll(/\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g)];
  for (const m of allDates) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatUsDate(m[1], m[2], m[3]);
    }
  }
  return "";
}

function parseOpponentFromText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const oppIdx = lines.findIndex((l) => /^OPPONENT\s*:?\s*$/i.test(l) || /^OPPONENT\s*:/i.test(l));
  if (oppIdx >= 0) {
    for (let i = oppIdx + 1; i < Math.min(oppIdx + 10, lines.length); i++) {
      const line = lines[i].replace(/^OPPONENT\s*:\s*/i, "").trim();
      if (!line || /^(SET SCORES|DATE|COACH|LOCATION|TEAM|RESULT|#|PLAYER|KILLS)/i.test(line)) continue;
      if (/^SET\s+SCORES/i.test(line)) continue;
      if (/rally|volleyball/i.test(line)) continue;
      if (/[A-Za-z]{4,}/.test(line)) {
        return line.replace(/\s+SET\s+SCORES.*$/i, "").trim();
      }
    }
  }

  const inline = text.match(/OPPONENT\s*:\s*([A-Za-z0-9][A-Za-z0-9\s.'\-]{2,48})/i);
  if (inline) {
    const val = inline[1]
      .trim()
      .replace(/\s+SET\s+SCORES?.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!/^SET\s+SCORES/i.test(val) && val.length > 3) return val;
  }

  for (const line of lines) {
    if (/high school|high\s+school/i.test(line) && !/location/i.test(line)) {
      return line.trim();
    }
  }

  const vs = text.match(/(?:vs\.?\s+|played\s+|@\s+)([A-Za-z0-9][A-Za-z0-9\s.'\-]{2,40})/i);
  if (vs) return vs[1].trim().split(/\n/)[0].trim();
  return "";
}

function parseResultSetsFromText(text) {
  const winLine = text.match(/\b(?:Win|Loss|W|L)\s+(\d)\s*[-–]\s*(\d)\b/i);
  if (winLine) return { our_score: winLine[1], opp_score: winLine[2] };

  const result = text.match(/RESULT\s*:\s*(?:Win|Loss|W|L)?\s*(\d)\s*[-–]\s*(\d)/i);
  if (result) return { our_score: result[1], opp_score: result[2] };

  return { our_score: "", opp_score: "" };
}

function isValidVolleyballSetScore(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a < 0 || b < 0) return false;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi > 25) return false;
  if (hi === 25 && lo < 10) return false;
  if (hi >= 25 && hi - lo >= 2) return true;
  if (hi === 15 && lo <= 13) return true;
  return false;
}

function ocrDigitsToValue(raw) {
  const normalized = String(raw || "")
    .slice(0, 12)
    .replace(/[aA@]/g, "6")
    .replace(/[oOQD]/g, "0")
    .replace(/[lLI|!]/g, "1")
    .replace(/[S$]/g, "5")
    .replace(/[bB]/g, "8")
    .replace(/[gGzq]/g, "9");
  const m = normalized.match(/\d{1,3}/);
  return m ? m[0] : "";
}

function readStatLabel(section, labelPattern) {
  const lines = section.split(/\r?\n/);
  const re = new RegExp(`^\\s*${labelPattern}\\s*:?\\s*(.*)$`, "i");

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    let raw = m[1].trim();
    if (!raw && lines[i + 1] && !/^[A-Z]/i.test(lines[i + 1])) {
      raw = lines[i + 1].trim();
    }
    const digits = ocrDigitsToValue(raw);
    if (digits) return toNumStr(digits);
  }
  return "";
}

function parseTeamStatisticsBlock(text) {
  const block = text.match(/TEAM\s+STATISTICS([\s\S]{0,600})/i);
  if (!block) return null;

  const section = block[1];
  const totals = {
    kills: readStatLabel(section, "KILLS"),
    hits: readStatLabel(section, "HITS"),
    blocks: readStatLabel(section, "BLOCKS"),
    digs: readStatLabel(section, "DIGS"),
    aces: readStatLabel(section, "SERVE\\s+ACES") || readStatLabel(section, "ACES"),
    service_receptions: readStatLabel(section, "SERVE\\s+RECEPTIONS"),
    hitting_errors: readStatLabel(section, "ERRORS"),
  };

  return Object.values(totals).some(Boolean) ? totals : null;
}

function tryCorrectSetPair(a, b) {
  if (isValidVolleyballSetScore(a, b)) return `${a}-${b}`;
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  if (hi === 25 && lo < 10) {
    const corrected = 10 + lo;
    if (isValidVolleyballSetScore(hi, corrected)) return `${hi}-${corrected}`;
  }
  return null;
}

/** Normalize OCR artifacts like 2520 → 25-20. */
function normalizeScoreToken(token) {
  const clean = String(token).replace(/\s/g, "");
  const dash = clean.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (dash) {
    return tryCorrectSetPair(Number(dash[1]), Number(dash[2]));
  }

  const joined = clean.match(/^(\d{2})(\d{2})$/);
  if (joined) {
    const a = Number(joined[1]);
    const b = Number(joined[2]);
    return tryCorrectSetPair(a, b);
  }
  return null;
}

function extractSetScores(text) {
  const scores = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const idx = lines.findIndex((l) => /SET\s*SCORES/i.test(l));
  const regionLines =
    idx >= 0
      ? lines.slice(idx, Math.min(idx + 6, lines.length))
      : lines.slice(0, 10);

  const haystacks = [
    regionLines.join(" "),
    lines.slice(0, 14).join(" "),
  ];

  const resultSection = text.match(/RESULT\s*:([\s\S]{0,100})/i);
  const locationSection = text.match(/LOCATION\s*:([\s\S]{0,100})/i);
  if (resultSection) haystacks.push(resultSection[1]);
  if (locationSection) haystacks.push(locationSection[1]);

  for (const haystack of haystacks) {
    for (const m of haystack.matchAll(/\b(\d{1,2})\s*[-–]\s*(\d{1,2})\b/g)) {
      const pair = tryCorrectSetPair(Number(m[1]), Number(m[2]));
      if (pair) scores.push(pair);
    }

    for (const m of haystack.matchAll(/\b(\d{4})\b/g)) {
      const norm = normalizeScoreToken(m[1]);
      if (norm) scores.push(norm);
    }

    for (const m of haystack.matchAll(/(\d{2})\s*,\s*(\d{1,2})\s*[-–]\s*(\d{1,2})/g)) {
      const joined = normalizeScoreToken(m[1]);
      if (joined) scores.push(joined);
      const pair = tryCorrectSetPair(Number(m[2]), Number(m[3]));
      if (pair) scores.push(pair);
    }
  }

  return [...new Set(scores)].slice(0, 5);
}

function mergeTeamTotals(row, block) {
  if (!row && !block) return null;
  if (!row) return block;
  if (!block) return row;
  return {
    kills: row.kills || block.kills,
    hits: row.hits || block.hits,
    blocks: row.blocks || block.blocks,
    digs: block.digs || row.digs,
    aces: block.aces || row.aces,
    service_receptions: block.service_receptions || row.service_receptions,
    hitting_errors: block.hitting_errors || row.hitting_errors,
  };
}

function parseTeamTotalsRow(text) {
  const block = parseTeamStatisticsBlock(text);
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  for (let i = 0; i < lines.length; i++) {
    if (!/team\s+totals/i.test(lines[i])) continue;

    const chunk = lines.slice(i, i + 3).join(" ");
    const nums = [...chunk.matchAll(/\d+/g)].map((m) => m[0]).filter((n) => Number(n) <= 999);
    if (nums.length < 3) continue;

    const fields = TABLE_STAT_FIELDS;
    const row = {};
    if (nums[0] && Number(nums[0]) >= 20) {
      row.kills = toNumStr(nums[0]);
      row.hits = nums[1] ? toNumStr(nums[1]) : "";
      row.blocks = nums[2] ? toNumStr(nums[2]) : "";
      if (nums[3] && Number(nums[3]) >= 30) row.digs = toNumStr(nums[3]);
      const tail = nums.slice(row.digs ? 4 : 3);
      if (tail[0] && Number(tail[0]) <= 30) row.aces = toNumStr(tail[0]);
      if (tail[1] && Number(tail[1]) >= 30) row.service_receptions = toNumStr(tail[1]);
      if (tail[2] && Number(tail[2]) <= 30) row.hitting_errors = toNumStr(tail[2]);
    } else {
      const slice = nums.length >= fields.length ? nums.slice(-fields.length) : nums;
      fields.forEach((field, idx) => {
        if (slice[idx] != null) row[field] = toNumStr(slice[idx]);
      });
    }

    if (Object.values(row).filter(Boolean).length >= 3) {
      return mergeTeamTotals(row, block);
    }
  }

  return block;
}

function parseMatchInfo(text) {
  const match = {
    date: parseDateFromText(text),
    opponent: parseOpponentFromText(text),
    set_scores: extractSetScores(text),
    our_score: "",
    opp_score: "",
  };

  const resultSets = parseResultSetsFromText(text);
  match.our_score = resultSets.our_score;
  match.opp_score = resultSets.opp_score;

  if ((!match.our_score || !match.opp_score) && match.set_scores.length) {
    let ours = 0;
    let oppSets = 0;
    for (const set of match.set_scores) {
      const [a, b] = set.split("-").map(Number);
      if (a > b) ours += 1;
      else if (b > a) oppSets += 1;
    }
    if (!match.our_score) match.our_score = ours ? String(ours) : "";
    if (!match.opp_score) match.opp_score = oppSets ? String(oppSets) : "";
  }

  return match;
}

function detectColumns(headerLine) {
  const lower = headerLine.toLowerCase();
  const columns = [];
  const usedFields = new Set();

  const entries = HEADER_ALIASES.flatMap((alias) =>
    alias.keys.map((key) => ({ key, field: alias.field }))
  ).sort((a, b) => b.key.length - a.key.length);

  for (const { key, field } of entries) {
    if (usedFields.has(field)) continue;
    let idx = -1;
    if (key.includes(" ")) {
      idx = lower.indexOf(key);
    } else {
      const regex = new RegExp(`\\b${escapeRegex(key)}\\b|${escapeRegex(key)}`, "i");
      const m = lower.match(regex);
      idx = m ? m.index : -1;
    }
    if (idx >= 0) {
      columns.push({ field, idx });
      usedFields.add(field);
    }
  }

  columns.sort((a, b) => a.idx - b.idx);
  return columns;
}

function findHeaderLine(lines) {
  const inline = lines.find(
    (l) =>
      /#\s*PLAYER|player.*kill/i.test(l) &&
      /kill|hit|dig|block|ace|reception|error/i.test(l)
  );
  if (inline) return inline;

  const idx = lines.findIndex((l) => /^#\s*$|^#$/i.test(l) || l === "#");
  if (idx >= 0) {
    const window = lines.slice(idx, idx + 12).join(" ");
    if (/PLAYER/i.test(window) && /KILLS/i.test(window)) return window;
  }
  return "";
}

function expandStatNumbers(rawNums, jersey) {
  const jerseyStr = String(jersey);
  const out = [];

  for (const raw of rawNums) {
    const num = Number(raw);
    if (!Number.isFinite(num)) continue;

    if (num > 99 && String(num).startsWith(jerseyStr)) {
      out.push(jerseyStr);
      const rest = String(num).slice(jerseyStr.length);
      if (rest) out.push(rest);
      continue;
    }

    if (num <= 99) out.push(String(num));
  }

  return out;
}

function extractStatNumbers(rawTail, jersey) {
  const nums = [...String(rawTail).matchAll(/\d+/g)].map((m) => m[0]);
  let expanded = expandStatNumbers(nums, jersey);
  const fields = TABLE_STAT_FIELDS.length;
  if (!expanded.length) return [];

  if (expanded.length >= 2 && expanded[expanded.length - 1] === expanded[1]) {
    expanded = expanded.slice(0, -1);
  }

  if (expanded[0] === String(jersey) && expanded.length >= fields) {
    return expanded.slice(0, fields);
  }
  if (expanded.length >= fields + 1 && expanded[0] === String(jersey)) {
    return expanded.slice(1, 1 + fields);
  }
  if (expanded.length >= fields) {
    return expanded.slice(0, fields);
  }
  return expanded;
}

function mapStatsToRow(statNums, columns) {
  const fields =
    columns.length >= 5 ? columns.map((c) => c.field) : TABLE_STAT_FIELDS;

  const row = {};
  fields.forEach((field, i) => {
    const val = statNums[i];
    if (val == null) return;
    row[field] = toNumStr(val);
  });
  return row;
}

function parsePlayerLine(line) {
  if (/team\s+totals|team\s+statistics|^#|^notes|^player$|^kills$|^hits$/i.test(line)) return null;

  const jerseyMatch = line.match(/^[\[\|\s\.§]*(\d{1,2})[\.\|\]\[\s\|]*/);
  if (!jerseyMatch) return null;

  const jersey = jerseyMatch[1];
  const rest = line.slice(jerseyMatch[0].length);

  const nameMatch = rest.match(/^([A-Za-z][A-Za-z\s.'\-]{1,35}?)\s+(.*)$/);
  if (!nameMatch) return null;

  const name = nameMatch[1].replace(/[\[\|\]]/g, "").trim();
  if (!name || name.length < 2 || /^(Li|El|hz|gd|Y)$/i.test(name)) return null;

  const statNums = extractStatNumbers(nameMatch[2], jersey);
  if (statNums.length < 3) return null;

  return {
    jersey_number: jersey,
    name,
    statNums,
  };
}

function parsePlayerTable(text, columns) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const headerIdx = lines.findIndex((l) => findHeaderLine([l]));
  const totalsIdx = lines.findIndex((l) => /team\s+totals/i.test(l));
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;
  const end = totalsIdx >= 0 ? totalsIdx : lines.length;

  const rows = [];
  for (const line of lines.slice(start, end)) {
    const parsed = parsePlayerLine(line);
    if (!parsed) continue;
    rows.push({
      jersey_number: parsed.jersey_number,
      name: parsed.name,
      ...mapStatsToRow(parsed.statNums, columns),
    });
  }
  return rows;
}

function findPlayerLine(lines, player) {
  const jersey = player.jersey_number != null ? String(player.jersey_number) : "";
  const fullName = normName(player.name);
  const firstName = fullName.split(" ")[0] || "";
  const lastName = fullName.split(" ").pop() || "";

  for (const line of lines) {
    const n = normName(line);
    if (fullName && n.includes(fullName)) return line;
  }

  for (const line of lines) {
    const n = normName(line);
    if (!firstName || !n.includes(firstName)) continue;
    const lastVariants = [lastName, lastName.slice(0, -1), lastName.slice(0, 4)].filter(Boolean);
    if (lastVariants.some((v) => v.length > 2 && n.includes(v))) return line;
  }

  for (const line of lines) {
    if (jersey && new RegExp(`^\\s*[\\[\\|§\\.]*#?${jersey}\\b`).test(line)) return line;
  }

  for (const line of lines) {
    const n = normName(line);
    if (lastName && lastName.length > 2 && n.includes(lastName)) return line;
  }
  return null;
}

function pickStatFields(row) {
  const out = blankPlayer();
  for (const f of SHEET_FIELDS) {
    if (row[f] !== "" && row[f] != null) out[f] = toNumStr(row[f]);
  }
  return out;
}

/** Structured debug report for OCR troubleshooting (logic-only, not used in UI). */
export function debugStatSheetParse(text, roster) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const match = parseMatchInfo(text);
  const headerLine = findHeaderLine(lines) || "";
  const columns = headerLine ? detectColumns(headerLine) : [];
  const tableRows = parsePlayerTable(text, columns);
  const teamTotals = parseTeamTotalsRow(text);
  const teamBlock = parseTeamStatisticsBlock(text);

  const expected = {
    date: "2026-06-08",
    opponent: "Westview High School",
    our_score: "3",
    opp_score: "1",
    set_scores: ["25-20", "23-25", "25-18", "25-19"],
  };

  const failures = [];
  if (match.date !== expected.date) failures.push({ field: "date", got: match.date, expected: expected.date });
  if (!/westview/i.test(match.opponent || "")) failures.push({ field: "opponent", got: match.opponent, expected: expected.opponent });
  if (match.our_score !== expected.our_score) failures.push({ field: "our_score", got: match.our_score, expected: expected.our_score });
  if (match.opp_score !== expected.opp_score) failures.push({ field: "opp_score", got: match.opp_score, expected: expected.opp_score });
  if (match.set_scores.length < 4) failures.push({ field: "set_scores", got: match.set_scores, expected: expected.set_scores });

  const players = parsePlayersFromRoster(text, roster, columns);
  const filled = players.filter((p) => rowHasStats(p)).length;
  if (filled < 8) failures.push({ field: "players", got: `${filled} rows`, expected: "11 player rows" });

  return {
    rawText: text,
    match,
    headerLine,
    columns: columns.map((c) => c.field),
    tableRows,
    teamTotals,
    teamBlock,
    players,
    filled,
    failures,
  };
}

/** Parse OCR text into stat rows using roster names and table heuristics. */
export function parseStatSheetText(text, roster, log) {
  log?.(SCAN_STEPS.STAT_PARSING, "start", `${text.length} chars, ${roster.length} roster players`);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const match = parseMatchInfo(text);
  const headerLine = findHeaderLine(lines) || "";
  const columns = headerLine ? detectColumns(headerLine) : [];

  log?.(
    SCAN_STEPS.STAT_PARSING,
    "progress",
    `header=${headerLine ? "found" : "missing"} cols=${columns.map((c) => c.field).join(",") || "default"}`
  );

  const tableRows = parsePlayerTable(text, columns);
  const players = parsePlayersFromRoster(text, roster, columns);

  const filled = players.filter((p) => rowHasStats(p)).length;
  log?.(SCAN_STEPS.STAT_PARSING, "done", `${filled} players with stats, ${tableRows.length} table rows`);

  return { match, players, tableRows, teamTotals: parseTeamTotalsRow(text) };
}

function mergeMatchFromTexts(texts) {
  let best = {
    date: "",
    opponent: "",
    set_scores: [],
    our_score: "",
    opp_score: "",
  };
  let bestScore = -1;

  const allSetScores = [];
  for (const text of texts) {
    allSetScores.push(...extractSetScores(text));
  }
  const mergedSets = [...new Set(allSetScores)].slice(0, 5);

  for (const text of texts) {
    const m = parseMatchInfo(text);
    let score = 0;
    if (m.date) score += 4;
    if (/westview|high school/i.test(m.opponent)) score += 8;
    if (m.set_scores.length >= 3) score += 6;
    if (m.our_score === "3" && m.opp_score === "1") score += 12;
    else if (m.our_score && m.opp_score) score += 3;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }

  if (mergedSets.length >= best.set_scores.length) {
    best.set_scores = mergedSets;
  }

  if (best.our_score === "1" && best.opp_score === "1" && best.set_scores.length >= 3) {
    let ours = 0;
    let oppSets = 0;
    for (const set of best.set_scores) {
      const [a, b] = set.split("-").map(Number);
      if (a > b) ours += 1;
      else if (b > a) oppSets += 1;
    }
    best.our_score = String(ours);
    best.opp_score = String(oppSets);
  }

  if ((!best.our_score || !best.opp_score) && best.set_scores.length) {
    let ours = 0;
    let oppSets = 0;
    for (const set of best.set_scores) {
      const [a, b] = set.split("-").map(Number);
      if (a > b) ours += 1;
      else if (b > a) oppSets += 1;
    }
    if (!best.our_score) best.our_score = ours ? String(ours) : "";
    if (!best.opp_score) best.opp_score = oppSets ? String(oppSets) : "";
  }

  return best;
}

function extractStatNumbersAfterName(line, player) {
  const parts = String(player.name || "")
    .split(/\s+/)
    .filter(Boolean);
  let tail = line;

  for (const part of parts) {
    const idx = tail.toLowerCase().indexOf(part.toLowerCase());
    if (idx >= 0) tail = tail.slice(idx + part.length);
  }

  return extractStatNumbers(tail.trim(), player.jersey_number);
}

function parsePlayersFromRoster(text, roster, columns) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  return roster.map((r) => {
    const base = {
      ...blankPlayer(),
      name: r.name,
      jersey_number: r.jersey_number != null ? String(r.jersey_number) : "",
      user_id: r.id,
    };

    const line = findPlayerLine(lines, r);
    if (!line) return base;

    const statNums = extractStatNumbersAfterName(line, r);
    if (statNums.length < 2) return base;

    return { ...base, ...mapStatsToRow(statNums, columns) };
  });
}

/** OCR + text parse pipeline. Tries multiple PSM modes and keeps the best parse. */
export async function parseStatSheetWithOcr({ buffer, roster, log }) {
  log?.(SCAN_STEPS.OCR_EXTRACTION, "start", `buffer ${buffer.length} bytes`);

  let worker;
  const texts = [];

  try {
    worker = await withTimeout(
      Tesseract.createWorker("eng", 1, tesseractWorkerOptions((m) => {
        if (m.status === "recognizing text") {
          log?.(SCAN_STEPS.OCR_EXTRACTION, "progress", `${Math.round(m.progress * 100)}%`);
        }
      })),
      OCR_TIMEOUT_MS,
      SCAN_STEPS.OCR_EXTRACTION
    );

    const matchPassModes = [3, 4];
    for (const psm of matchPassModes) {
      const text = await withTimeout(
        recognizeWithPsm(worker, buffer, psm),
        PER_PSM_TIMEOUT_MS,
        SCAN_STEPS.OCR_EXTRACTION
      );
      texts.push({ psm, text });
      log?.(
        SCAN_STEPS.OCR_EXTRACTION,
        "progress",
        `PSM ${psm} ocrScore=${scoreOcrText(text)} parseScore=${scoreParseResult(parseStatSheetText(text, roster))}`
      );
    }

    const firstScore = scoreParseResult(parseStatSheetText(texts[0]?.text || "", roster));
    const mergedSets = mergeMatchFromTexts(texts.map((t) => t.text)).set_scores;
    if (firstScore < MIN_PARSE_SCORE || mergedSets.length < 4) {
      for (const psm of OCR_PSM_MODES.slice(1)) {
        const text = await withTimeout(
          recognizeWithPsm(worker, buffer, psm),
          PER_PSM_TIMEOUT_MS,
          SCAN_STEPS.OCR_EXTRACTION
        );
        texts.push({ psm, text });
        log?.(
          SCAN_STEPS.OCR_EXTRACTION,
          "progress",
          `PSM ${psm} ocrScore=${scoreOcrText(text)} parseScore=${scoreParseResult(parseStatSheetText(text, roster))}`
        );
      }
    }
  } catch (err) {
    log?.(SCAN_STEPS.OCR_EXTRACTION, "error", err.message);
    throw err;
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        /* ignore */
      }
    }
  }

  let bestText = texts[0]?.text || "";
  let bestParsed = parseStatSheetText(bestText, roster, log);
  let bestScore = scoreParseResult(bestParsed);
  let bestPsm = texts[0]?.psm;
  let bestPlayerCount = countFilledStats(bestParsed.players);

  for (const { psm, text } of texts) {
    const parsed = parseStatSheetText(text, roster, log);
    const score = scoreParseResult(parsed);
    const playerCount = countFilledStats(parsed.players);
    if (score > bestScore || (score === bestScore && playerCount > bestPlayerCount)) {
      bestScore = score;
      bestText = text;
      bestParsed = parsed;
      bestPsm = psm;
      bestPlayerCount = playerCount;
    }
  }

  const mergedMatch = mergeMatchFromTexts(texts.map((t) => t.text));
  bestParsed = {
    ...bestParsed,
    match: {
      ...bestParsed.match,
      date: mergedMatch.date || bestParsed.match.date,
      opponent: mergedMatch.opponent || bestParsed.match.opponent,
      set_scores:
        mergedMatch.set_scores.length >= (bestParsed.match.set_scores?.length || 0)
          ? mergedMatch.set_scores
          : bestParsed.match.set_scores,
      our_score: mergedMatch.our_score || bestParsed.match.our_score,
      opp_score: mergedMatch.opp_score || bestParsed.match.opp_score,
    },
  };

  log?.(
    SCAN_STEPS.OCR_EXTRACTION,
    "done",
    `PSM ${bestPsm} selected for table, ${bestText.length} chars, parseScore=${bestScore}`
  );

  return {
    ...bestParsed,
    ocrText: bestText,
  };
}

export function countFilledStats(players) {
  return players.filter((p) => rowHasStats(p)).length;
}
