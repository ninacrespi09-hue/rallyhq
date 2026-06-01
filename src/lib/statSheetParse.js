import Anthropic from "@anthropic-ai/sdk";
import {
  countFilledStats,
  parseStatSheetText,
  parseStatSheetWithOcr,
} from "./statSheetOcr";
import { SCAN_STEPS, withTimeout } from "./statSheetLog";

/**
 * Fields we try to read from a photographed volleyball stat sheet.
 */
function emptyMatch() {
  return {
    date: "",
    opponent: "",
    set_scores: [],
    our_score: "",
    opp_score: "",
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
    add_new: false,
  };
}

function normName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toStr(value) {
  if (value === null || value === undefined) return "";
  return String(value);
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

/** Match parsed rows to the team roster by jersey number, then name. */
export function matchPlayersToRoster(rows, roster) {
  return rows.map((row) => {
    let user_id = row.user_id ?? null;

    if (!user_id && row.jersey_number !== "" && row.jersey_number != null) {
      const jersey = Number(row.jersey_number);
      const byJersey = roster.find((r) => Number(r.jersey_number) === jersey);
      if (byJersey) user_id = byJersey.id;
    }

    if (!user_id && row.name) {
      const target = normName(row.name);
      const exact = roster.find((r) => normName(r.name) === target);
      if (exact) {
        user_id = exact.id;
      } else {
        const partial = roster.find((r) => {
          const n = normName(r.name);
          return n.includes(target) || target.includes(n);
        });
        if (partial) user_id = partial.id;
      }
    }

    return { ...row, user_id };
  });
}

function normalizeParsed(raw) {
  const match = raw?.match || {};
  const setScores = Array.isArray(match.set_scores)
    ? match.set_scores.map((s) => String(s).trim()).filter(Boolean)
    : [];

  let ourScore = toNumStr(match.our_score ?? match.our_sets_won);
  let oppScore = toNumStr(match.opp_score ?? match.opp_sets_won);

  if ((!ourScore || !oppScore) && setScores.length) {
    let ours = 0;
    let opp = 0;
    for (const set of setScores) {
      const parts = String(set).split(/[-–]/).map((p) => Number(p.trim()));
      if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) continue;
      if (parts[0] > parts[1]) ours += 1;
      else if (parts[1] > parts[0]) opp += 1;
    }
    if (!ourScore) ourScore = ours ? String(ours) : "";
    if (!oppScore) oppScore = opp ? String(opp) : "";
  }

  const players = Array.isArray(raw?.players)
    ? raw.players.map((p) => ({
        name: toStr(p.name),
        jersey_number: p.jersey_number === null || p.jersey_number === undefined ? "" : toStr(p.jersey_number),
        user_id: null,
        aces: toNumStr(p.aces),
        service_errors: toNumStr(p.service_errors),
        kills: toNumStr(p.kills),
        hitting_errors: toNumStr(p.hitting_errors),
        assists: toNumStr(p.assists),
        digs: toNumStr(p.digs),
        blocks: toNumStr(p.blocks),
        service_receptions: toNumStr(p.service_receptions ?? p.pass_rating),
        hits: toNumStr(p.hits),
        add_new: false,
      }))
    : [];

  return {
    match: {
      date: toStr(match.date),
      opponent: toStr(match.opponent),
      set_scores: setScores,
      our_score: ourScore,
      opp_score: oppScore,
    },
    players,
  };
}

/**
 * Read a stat sheet photo with Claude vision when configured.
 * Falls back to OCR text extraction, then a manual review table.
 */
export async function parseStatSheetImage({ buffer, mediaType, roster, log }) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      log?.(SCAN_STEPS.CLAUDE_VISION, "start");
      const parsed = await withTimeout(
        parseWithClaude({ buffer, mediaType, roster }),
        25000,
        SCAN_STEPS.CLAUDE_VISION
      );
      const filled = countFilledStats(parsed.players);
      log?.(SCAN_STEPS.CLAUDE_VISION, "done", `${filled} players`);
      return {
        ...parsed,
        source: "claude",
        message:
          filled > 0
            ? `Scanned ${filled} player${filled === 1 ? "" : "s"} from your stat sheet. Review before saving.`
            : "Review the scanned stats below. Edit anything that looks off before saving.",
      };
    } catch (err) {
      log?.(SCAN_STEPS.CLAUDE_VISION, "error", err.message);
      console.error("Stat sheet vision parse failed:", err.message);
    }
  }

  try {
    const ocr = await parseStatSheetWithOcr({ buffer, roster, log });
    let players = matchPlayersToRoster(ocr.players, roster);
    let match = ocr.match;
    let source = "ocr";

    if (process.env.ANTHROPIC_API_KEY && ocr.ocrText?.trim()) {
      try {
        log?.(SCAN_STEPS.CLAUDE_TEXT, "start");
        const fromText = await withTimeout(
          parseTextWithClaude(ocr.ocrText, roster),
          15000,
          SCAN_STEPS.CLAUDE_TEXT
        );
        if (countFilledStats(fromText.players) >= countFilledStats(players)) {
          players = fromText.players;
          match = { ...match, ...fromText.match };
          source = "claude-text";
        }
        log?.(SCAN_STEPS.CLAUDE_TEXT, "done");
      } catch (err) {
        log?.(SCAN_STEPS.CLAUDE_TEXT, "error", err.message);
        console.error("Stat sheet text parse failed:", err.message);
      }
    }

    const filled = countFilledStats(players);
    const hasMatch = Boolean(match.opponent || match.date || match.set_scores?.length);

    if (filled > 0 || hasMatch) {
      return {
        match,
        players,
        source,
        message:
          filled > 0
            ? `Read stats for ${filled} player${filled === 1 ? "" : "s"} from your photo. Double-check before saving.`
            : "We found match info but couldn't read all player stats. Fill in the blanks.",
      };
    }

    if (ocr.ocrText?.trim().length > 30) {
      const textParsed = parseStatSheetText(ocr.ocrText, roster, log);
      players = matchPlayersToRoster(textParsed.players, roster);
      const textFilled = countFilledStats(players);
      if (textFilled > 0) {
        return {
          match: { ...match, ...textParsed.match },
          players,
          source: "ocr",
          message: `Read stats for ${textFilled} player${textFilled === 1 ? "" : "s"}. Some fields may need correction.`,
        };
      }
    }
  } catch (err) {
    log?.(SCAN_STEPS.OCR_EXTRACTION, "error", err.message);
    console.error("Stat sheet OCR failed:", err.message);
    throw err;
  }

  return {
    match: emptyMatch(),
    players: roster.map((r) => ({
      ...blankPlayer(),
      name: r.name,
      jersey_number: r.jersey_number != null ? String(r.jersey_number) : "",
      user_id: r.id,
    })),
    source: "manual",
    message:
      "We couldn't read the photo clearly. Try a brighter, straighter photo — or fill in the table manually.",
  };
}

async function parseTextWithClaude(text, roster) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const rosterLines = roster
    .map((r) => `${r.name}${r.jersey_number != null ? ` (#${r.jersey_number})` : ""}`)
    .join("\n");

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "You extract volleyball statistics from OCR text of a stat sheet. Return ONLY valid JSON. Use empty strings for unknown values.",
    messages: [
      {
        role: "user",
        content:
          `OCR text from stat sheet:\n${text}\n\nTeam roster:\n${rosterLines}\n\n` +
          `Return JSON: {"match":{"date":"","opponent":"","set_scores":[],"our_sets_won":0,"opp_sets_won":0},"players":[{"name":"","jersey_number":"","aces":"","service_errors":"","kills":"","hitting_errors":"","assists":"","digs":"","blocks":"","service_receptions":"","hits":""}]}`,
      },
    ],
  });

  const raw = msg.content.find((b) => b.type === "text")?.text || "{}";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const json = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : "{}");
  const normalized = normalizeParsed(json);
  return {
    ...normalized,
    players: matchPlayersToRoster(normalized.players, roster),
  };
}

async function parseWithClaude({ buffer, mediaType, roster }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = buffer.toString("base64");
  const safeMedia = mediaType?.startsWith("image/") ? mediaType : "image/jpeg";

  const rosterLines = roster
    .map((r) => `${r.name}${r.jersey_number != null ? ` (#${r.jersey_number})` : ""}`)
    .join("\n");

  const system =
    "You extract volleyball match statistics from photos of paper stat sheets. " +
    "Return ONLY valid JSON. Use empty strings for values you cannot read clearly. " +
    "Do not invent stats. Prefer blank fields over guesses.";

  const prompt =
    "Read this volleyball stat sheet image and extract all player rows and match info.\n\n" +
    "Team roster for reference (match names/numbers when possible):\n" +
    rosterLines +
    "\n\nReturn JSON exactly in this shape:\n" +
    `{
  "match": {
    "date": "YYYY-MM-DD or empty string",
    "opponent": "opponent team name or empty string",
    "set_scores": ["25-20", "23-25"],
    "our_sets_won": 2,
    "opp_sets_won": 1
  },
  "players": [
    {
      "name": "Player Name",
      "jersey_number": 7,
      "aces": 2,
      "service_errors": 1,
      "kills": 12,
      "hitting_errors": 3,
      "assists": 0,
      "digs": 8,
      "blocks": 1,
      "service_receptions": 12,
      "hits": 15
    }
  ]
}`;

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: safeMedia, data: base64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const text = msg.content.find((b) => b.type === "text")?.text || "{}";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const json = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : "{}");
  const normalized = normalizeParsed(json);
  return {
    ...normalized,
    players: matchPlayersToRoster(normalized.players, roster),
  };
}

/** Editable blank preview when OCR/vision fails or times out. */
export function manualFallbackFromRoster(roster) {
  return {
    match: emptyMatch(),
    players:
      roster.length > 0
        ? roster.map((r) => ({
            ...blankPlayer(),
            name: r.name,
            jersey_number: r.jersey_number != null ? String(r.jersey_number) : "",
            user_id: r.id,
          }))
        : [blankPlayer()],
    source: "manual",
    message: "Scan incomplete — fill in or fix stats, then save.",
  };
}

/** Map sheet row values into DB player_stats columns. */
export function sheetRowToDbStats(row) {
  const n = (v) => Math.max(0, Number(v) || 0);
  const serviceErrors = n(row.service_errors);
  const hittingErrors = n(row.hitting_errors);
  const kills = n(row.kills);
  const hits = row.hits !== "" && row.hits != null ? n(row.hits) : kills + hittingErrors;

  return {
    kills,
    hits,
    assists: n(row.assists),
    aces: n(row.aces),
    digs: n(row.digs),
    blocks: n(row.blocks),
    errors: serviceErrors + hittingErrors,
    service_receptions: n(row.service_receptions),
  };
}
