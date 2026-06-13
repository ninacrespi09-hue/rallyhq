// Pure statistic definitions (no DB imports) — safe for client components.
import { getStatsForSport } from "./sports";

/** Volleyball default — kept for backward compatibility. */
export const STATS = getStatsForSport("volleyball");

export function statsForSport(sport) {
  return getStatsForSport(sport);
}
