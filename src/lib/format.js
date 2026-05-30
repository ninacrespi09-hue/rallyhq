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

// Tag colors — Blue = Practice, Gold = Tournament, Green = Team Bonding.
// Games keep a distinct deep-blue (indigo) so they stay on-theme but readable.
export const EVENT_STYLES = {
  practice: { label: "Practice", chip: "bg-blue-100 text-blue-700", dot: "bg-blue-500", bar: "bg-blue-500" },
  game: { label: "Game", chip: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500", bar: "bg-indigo-500" },
  tournament: { label: "Tournament", chip: "bg-amber-100 text-amber-700", dot: "bg-amber-400", bar: "bg-amber-400" },
  bonding: { label: "Team Bonding", chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", bar: "bg-emerald-500" },
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
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};
