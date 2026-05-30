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
  practice:   { label: "Practice",     chip: "bg-sky-200 text-sky-900 font-bold",    dot: "bg-sky-300",    bar: "bg-sky-300",    ring: "ring-2 ring-sky-300",    bg: "bg-sky-100/70" },
  game:       { label: "Game",         chip: "bg-blue-600 text-white font-bold",      dot: "bg-blue-600",   bar: "bg-blue-600",   ring: "ring-2 ring-blue-600",   bg: "bg-blue-200/70" },
  tournament: { label: "Tournament",   chip: "bg-indigo-800 text-white font-bold",    dot: "bg-indigo-800", bar: "bg-indigo-800", ring: "ring-2 ring-indigo-800", bg: "bg-indigo-200/70" },
  bonding:    { label: "Team Bonding", chip: "bg-cyan-300 text-cyan-950 font-bold",   dot: "bg-cyan-400",   bar: "bg-cyan-400",   ring: "ring-2 ring-cyan-400",   bg: "bg-cyan-100/70" },
};

// Events that have results / stats / post-game wellness.
export const COMPETITIVE_TYPES = ["game", "tournament"];
export function isCompetitive(type) {
  return COMPETITIVE_TYPES.includes(type);
}

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

export const SEVERITY_STYLES = {
  high: "bg-blue-100 text-blue-800",
  medium: "bg-sky-100 text-sky-700",
  low: "bg-navy-50 text-navy-600",
};
