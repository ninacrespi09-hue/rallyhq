/** Build SQL SELECT fragments for season stat totals from sport stat definitions. */
export function buildStatSumSelect(statDefs) {
  const parts = ["COUNT(ps.id) AS games"];
  for (const s of statDefs) {
    if (s.agg === "avg") {
      parts.push(`ROUND(COALESCE(AVG(ps.${s.key}), 0)) AS ${s.key}`);
    } else if (s.agg === "computed") {
      if (s.key === "goals_assists_avg") {
        parts.push(
          `ROUND(COALESCE(AVG(CAST(ps.kills + ps.assists AS REAL)), 0), 1) AS goals_assists_avg`
        );
      }
    } else if (s.key) {
      parts.push(`COALESCE(SUM(ps.${s.key}), 0) AS ${s.key}`);
    }
  }
  return parts.join(", ");
}

/** DB-backed stat keys used for per-game save/update (excludes computed display-only stats). */
export function editableStatKeys(statDefs) {
  return statDefs.filter((s) => s.editable !== false && s.agg !== "computed").map((s) => s.key);
}

/** Format a stat value for display (percentages, averages, etc.). */
export function formatStatValue(stat, value, games = 0) {
  if (value == null) return "0";
  if (stat.agg === "computed" && stat.key === "goals_assists_avg") {
    return Number(value).toFixed(1);
  }
  if (stat.agg === "avg" || stat.suffix === "%") {
    return `${Math.round(Number(value) || 0)}%`;
  }
  if (stat.decimals) {
    return Number(value).toFixed(stat.decimals);
  }
  return String(value ?? 0);
}

/** Per-game value for computed stats shown in game tables. */
export function gameStatValue(stat, row) {
  if (stat.agg === "computed" && stat.key === "goals_assists_avg") {
    return (Number(row.kills) || 0) + (Number(row.assists) || 0);
  }
  return row[stat.key] ?? 0;
}

/** Grid class for stat card layouts — same design, more columns when needed. */
export function statGridClass(count) {
  if (count > 8) return "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
  if (count > 5) return "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";
  return "grid grid-cols-2 gap-3 sm:grid-cols-5";
}
