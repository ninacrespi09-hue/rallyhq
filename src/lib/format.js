import { getPositionsForSport } from "./sports";

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function fmtDateTime(iso) {
  if (!iso) return "";
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

// Four distinct blue-family shades for each event type.
export const EVENT_STYLES = {
  practice:      { label: "Practice",      chip: "bg-sky-100 text-sky-800 font-bold",    dot: "bg-sky-200",    bar: "bg-sky-200",    ring: "ring-2 ring-sky-200",    bg: "bg-sky-100/70" },
  conditioning:  { label: "Conditioning",  chip: "bg-blue-500 text-white font-bold",     dot: "bg-blue-500",   bar: "bg-blue-500",   ring: "ring-2 ring-blue-500",   bg: "bg-blue-100/70" },
  tournament:    { label: "Tournament",    chip: "bg-indigo-800 text-white font-bold",   dot: "bg-indigo-800", bar: "bg-indigo-800", ring: "ring-2 ring-indigo-800", bg: "bg-indigo-200/70" },
  bonding:       { label: "Team Bonding",  chip: "bg-cyan-200 text-cyan-950 font-bold",  dot: "bg-cyan-300",   bar: "bg-cyan-300",   ring: "ring-2 ring-cyan-300",   bg: "bg-cyan-100/70" },
  // keep "game" for any existing stored events
  game:          { label: "Game",          chip: "bg-blue-500 text-white font-bold",     dot: "bg-blue-500",   bar: "bg-blue-500",   ring: "ring-2 ring-blue-500",   bg: "bg-blue-100/70" },
  meeting:       { label: "Meeting",       chip: "bg-sky-100 text-sky-800 font-bold",    dot: "bg-sky-200",    bar: "bg-sky-200",    ring: "ring-2 ring-sky-200",    bg: "bg-sky-100/70" },
  other:         { label: "Other",         chip: "bg-sky-100 text-sky-800 font-bold",    dot: "bg-sky-200",    bar: "bg-sky-200",    ring: "ring-2 ring-sky-200",    bg: "bg-sky-100/70" },
};

const DEFAULT_EVENT_STYLE = EVENT_STYLES.practice;

export function getEventStyle(type) {
  if (type && EVENT_STYLES[type]) return EVENT_STYLES[type];
  const label =
    typeof type === "string" && type.length
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : DEFAULT_EVENT_STYLE.label;
  return { ...DEFAULT_EVENT_STYLE, label };
}

// Events that have results / stats / post-game wellness.
export const COMPETITIVE_TYPES = ["game", "tournament"];
export function isCompetitive(type) {
  return COMPETITIVE_TYPES.includes(type);
}

export const CONDITIONING_KINDS = [
  "Cardio Session",
  "Weight Training",
  "Agility Drills",
  "Sprint Training",
  "Recovery Session",
];

// Quick-pick ideas for team bonding events.
export const BONDING_KINDS = [
  "Team Dinner",
  "Beach Day",
  "Team Outing",
  "End-of-Season Celebration",
];

export const POSITIONS = [
  "Setter",
  "Libero",
  "Outside Hitter",
  "Opposite",
  "Middle Blocker",
  "Defensive Specialist",
  "Serving Specialist",
];

export function positionsForSport(sport) {
  return getPositionsForSport(sport);
}

export const SEVERITY_STYLES = {
  high: "bg-blue-100 text-blue-700",
  medium: "bg-sky-100 text-sky-600",
  low: "bg-navy-50 text-navy-600",
};
