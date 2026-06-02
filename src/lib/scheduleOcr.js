/**
 * Smart Schedule Upload — parse schedule photos into calendar events.
 * Real OCR via Tesseract; falls back to mock data when parsing finds nothing.
 */

import path from "path";
import Tesseract from "tesseract.js";

export const SCHEDULE_EVENT_TYPES = [
  { key: "practice", label: "Practice" },
  { key: "game", label: "Game" },
  { key: "tournament", label: "Tournament" },
  { key: "conditioning", label: "Conditioning" },
  { key: "bonding", label: "Team Bonding" },
  { key: "meeting", label: "Meeting" },
  { key: "other", label: "Other" },
];

const DATE_TOKEN_PATTERN =
  /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?)\b/i;

const TYPE_KEYWORDS = [
  { type: "tournament", words: ["tournament", "invitational", "showcase", "classic"] },
  { type: "game", words: [" vs ", " vs.", " game", "match", " @ ", " at "] },
  { type: "practice", words: ["practice", "pract", "training", "scrimmage"] },
  { type: "conditioning", words: ["conditioning", "cardio", "weight", "lift", "agility", "sprint"] },
  { type: "bonding", words: ["bonding", "team dinner", "outing", "celebration", "banquet"] },
  { type: "meeting", words: ["meeting", "parent night", "team meeting", "captains"] },
];

function tesseractWorkerOptions() {
  const pkgRoot = path.join(process.cwd(), "node_modules/tesseract.js");
  const coreRoot = path.join(process.cwd(), "node_modules/tesseract.js-core");
  return {
    workerPath: path.join(pkgRoot, "src/worker-script/node/index.js"),
    corePath: path.join(coreRoot, "tesseract-core-lstm.wasm.js"),
    workerBlobURL: false,
  };
}

/** Run OCR on a schedule image buffer. */
export async function ocrScheduleImage(bytes) {
  const worker = await Tesseract.createWorker("eng", 1, tesseractWorkerOptions());
  try {
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const { data } = await worker.recognize(bytes);
    return data?.text || "";
  } finally {
    await worker.terminate();
  }
}

function classifyType(text) {
  const lower = ` ${String(text || "").toLowerCase()} `;
  for (const { type, words } of TYPE_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return type;
  }
  if (/\bvs\.?\b/i.test(text)) return "game";
  return "other";
}

const MONTH_LOOKUP = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** If a parsed date is already in the past, roll it forward to the next occurrence. */
export function normalizeUpcomingDate(dateStr, ref = new Date()) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let [year, month, day] = dateStr.split("-").map(Number);
  let candidate = new Date(year, month - 1, day);

  for (let i = 0; i < 10 && candidate < today; i += 1) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDateToken(token, yearHint) {
  const year = yearHint || new Date().getFullYear();
  let m = token.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year;
    // US-style schedules: month/day[/year]
    const iso = `${y}-${String(Number(m[1])).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
    return normalizeUpcomingDate(iso);
  }
  m = token.match(/^([A-Za-z]{3,9})\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i);
  if (m) {
    const month = MONTH_LOOKUP[m[1].toLowerCase()];
    const day = Number(m[2]);
    const y = m[3] ? Number(m[3]) : year;
    if (month && day >= 1 && day <= 31) {
      const iso = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return normalizeUpcomingDate(iso);
    }
  }
  return "";
}

function parseTimeToken(token) {
  let m = token.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (m) {
    let h = Number(m[1]);
    const min = m[2];
    const ap = (m[3] || "").toLowerCase();
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${min}`;
  }
  m = token.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (m) {
    let h = Number(m[1]);
    if (m[2].toLowerCase() === "pm" && h < 12) h += 12;
    if (m[2].toLowerCase() === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }
  return "";
}

function extractOpponent(text) {
  const vs = text.match(/\bvs\.?\s+([A-Za-z0-9\s.'-]+?)(?:\s+@|\s+at|\s+\d|\s*$)/i);
  if (vs) return vs[1].trim();
  const at = text.match(/\b@\s+([A-Za-z0-9\s.'-]+?)(?:\s+\d|\s*$)/i);
  if (at) return at[1].trim();
  return "";
}

function extractLocation(text) {
  const at = text.match(/\b(?:@|at)\s+([A-Za-z0-9\s.'-]{3,})$/i);
  if (at) return at[1].trim();
  const gym = text.match(/\b(main gym|aux gym|fieldhouse|school|center|park|courts?)\b/i);
  if (gym) return gym[0];
  return "";
}

function blankEvent(overrides = {}) {
  return {
    type: "practice",
    title: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    opponent: "",
    notes: "",
    ...overrides,
  };
}

/** Parse OCR/plain text into draft schedule events. */
export function parseScheduleText(text) {
  if (!text?.trim()) return [];

  const yearHint = new Date().getFullYear();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const events = [];

  for (const line of lines) {
    if (line.length < 6) continue;
    if (/^(mon|tue|wed|thu|fri|sat|sun|date|time|schedule)/i.test(line) && !/\d/.test(line)) continue;

    const dateMatch = line.match(DATE_TOKEN_PATTERN);
    const date = dateMatch ? parseDateToken(dateMatch[1], yearHint) : "";

    const timeRange = line.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const singleTime = line.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/i);
    const start_time = timeRange
      ? parseTimeToken(timeRange[1].replace(/\s+/g, ""))
      : singleTime
        ? parseTimeToken(singleTime[1].replace(/\s+/g, ""))
        : "";
    const end_time = timeRange ? parseTimeToken(timeRange[2].replace(/\s+/g, "")) : "";

    const type = classifyType(line);
    let title = line
      .replace(dateMatch?.[0] || "", "")
      .replace(timeRange?.[0] || singleTime?.[0] || "", "")
      .replace(/\b@.+$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || title.length < 3) {
      title =
        type === "game"
          ? `Game${extractOpponent(line) ? ` vs ${extractOpponent(line)}` : ""}`
          : type === "practice"
            ? "Team Practice"
            : type.charAt(0).toUpperCase() + type.slice(1);
    }

    const opponent = type === "game" || type === "tournament" ? extractOpponent(line) : "";
    const location = extractLocation(line);

    if (!date && !start_time && !/\b(practice|game|tournament|vs)\b/i.test(line)) continue;

    events.push(
      blankEvent({
        type,
        title: title.slice(0, 120),
        date,
        start_time,
        end_time,
        location,
        opponent,
        notes: "",
      })
    );
  }

  return events;
}

/** Sample events when OCR cannot parse a usable schedule. */
export function mockScheduleEvents() {
  const base = new Date();
  const addDays = (n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  return [
    blankEvent({
      type: "practice",
      title: "Team Practice",
      date: addDays(2),
      start_time: "15:30",
      end_time: "17:30",
      location: "Main Gym",
      notes: "Bring kneepads",
    }),
    blankEvent({
      type: "game",
      title: "vs Lincoln High",
      date: addDays(5),
      start_time: "17:00",
      end_time: "19:00",
      location: "Lincoln High School",
      opponent: "Lincoln High",
      notes: "White jerseys",
    }),
    blankEvent({
      type: "conditioning",
      title: "Cardio Session",
      date: addDays(7),
      start_time: "06:30",
      end_time: "07:30",
      location: "Track",
    }),
    blankEvent({
      type: "tournament",
      title: "Coastal Invitational",
      date: addDays(12),
      start_time: "08:00",
      end_time: "18:00",
      location: "Convention Center",
      notes: "Bus leaves at 7:00 AM",
    }),
    blankEvent({
      type: "bonding",
      title: "Team Dinner",
      date: addDays(14),
      start_time: "18:00",
      end_time: "20:00",
      location: "Mario's Pizza",
    }),
  ];
}

/** Full scan pipeline: OCR → parse → mock fallback. */
export async function scanScheduleFromImage(bytes) {
  let text = "";
  let ocrError = null;
  try {
    text = await ocrScheduleImage(bytes);
  } catch (err) {
    ocrError = err?.message || "OCR failed";
  }

  const parsed = parseScheduleText(text);
  if (parsed.length > 0) {
    return {
      events: parsed.map((e) => ({
        ...e,
        date: normalizeUpcomingDate(e.date),
      })),
      source: "ocr",
      message: "Review detected events before saving to the team schedule.",
      rawText: text.slice(0, 2000),
    };
  }

  return {
    events: mockScheduleEvents(),
    source: "mock",
    message: ocrError
      ? "Could not read the schedule from the photo — showing sample events you can edit before saving."
      : "No events detected in the image — showing sample events you can edit before saving.",
    rawText: text.slice(0, 2000),
  };
}

export function toEventIso(date, time) {
  if (!date || !time) return "";
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}`;
}

export function fromEventIso(iso) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const [date, rest] = iso.split("T");
    return { date: date || "", time: (rest || "").slice(0, 5) };
  }
  const date = d.toISOString().slice(0, 10);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}
