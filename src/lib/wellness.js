// Shared wellness scoring used by both the coach summary and the dashboard.

export const RECOVERY_NEEDS = [
  "Ice",
  "Heat",
  "Massage",
  "Stretching",
  "Rest day",
  "Physio",
  "Hydration",
  "Extra sleep",
];

/**
 * Classify a wellness record into an attention level.
 * @returns {{level:'rest'|'monitor'|'ok'|'none', reasons:string[]}}
 */
export function wellnessLevel(w) {
  if (!w) return { level: "none", reasons: [] };
  const reasons = [];
  if (w.injury) reasons.push("injury reported");
  if (w.soreness >= 4) reasons.push(`high soreness (${w.soreness}/5)`);
  if (w.recovery >= 4) reasons.push("needs recovery");
  if (w.energy <= 2) reasons.push(`low energy (${w.energy}/5)`);

  const needs = (w.recovery_needs || "").toLowerCase();
  if (needs.includes("rest") || needs.includes("physio")) reasons.push("requested rest/physio");

  const rest =
    w.injury || w.soreness >= 4 || w.recovery >= 4 || needs.includes("rest") || needs.includes("physio");
  return { level: rest ? "rest" : reasons.length ? "monitor" : "ok", reasons };
}

export const LEVEL_STYLE = {
  rest: { chip: "bg-red-100 text-red-700", label: "Needs rest", dot: "bg-red-500" },
  monitor: { chip: "bg-amber-100 text-amber-700", label: "Monitor", dot: "bg-amber-500" },
  ok: { chip: "bg-emerald-100 text-emerald-700", label: "Good", dot: "bg-emerald-500" },
};

export function levelRank(level) {
  return { rest: 3, monitor: 2, ok: 1, none: 0 }[level] || 0;
}
