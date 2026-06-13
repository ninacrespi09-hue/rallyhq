import { volleyball } from "./volleyball";
import { basketball } from "./basketball";
import { soccer } from "./soccer";

export const SPORTS = [volleyball, basketball, soccer];
export const SPORT_IDS = SPORTS.map((s) => s.id);

export function isSportId(sport) {
  return SPORT_IDS.includes(sport);
}

export function getSportConfig(sport) {
  const found = SPORTS.find((s) => s.id === sport);
  if (!found) throw new Error(`Unknown sport: ${sport}`);
  return found;
}

export function getStatsForSport(sport) {
  return getSportConfig(sport).stats;
}

export function getPositionsForSport(sport) {
  return getSportConfig(sport).positions;
}
