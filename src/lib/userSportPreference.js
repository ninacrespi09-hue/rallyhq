import { isSportId, SPORT_IDS } from "./sports";
import { sportPath } from "./sportPaths";

export const SPORT_PREF_ALL = "all";

/** Signup choices shown on the join screen. */
export const SIGNUP_OPTIONS = [
  { id: "volleyball-player", sport: "volleyball", role: "player", label: "Volleyball Player", icon: "🏐" },
  { id: "volleyball-coach", sport: "volleyball", role: "coach", label: "Volleyball Coach", icon: "🏐" },
  { id: "volleyball-parent", sport: "volleyball", role: "parent", label: "Volleyball Parent", icon: "🏐" },
  { id: "basketball-player", sport: "basketball", role: "player", label: "Basketball Player", icon: "🏀" },
  { id: "basketball-coach", sport: "basketball", role: "coach", label: "Basketball Coach", icon: "🏀" },
  { id: "basketball-parent", sport: "basketball", role: "parent", label: "Basketball Parent", icon: "🏀" },
  { id: "soccer-player", sport: "soccer", role: "player", label: "Soccer Player", icon: "⚽" },
  { id: "soccer-coach", sport: "soccer", role: "coach", label: "Soccer Coach", icon: "⚽" },
  { id: "soccer-parent", sport: "soccer", role: "parent", label: "Soccer Parent", icon: "⚽" },
  { id: "all-sports", sport: SPORT_PREF_ALL, role: null, label: "Interested in All Sports", icon: "🏟️" },
];

export function parseSignupOption(id) {
  return SIGNUP_OPTIONS.find((o) => o.id === id) || null;
}

export function isAllSportsUser(user) {
  return user?.sport_preference === SPORT_PREF_ALL;
}

export function primarySportForUser(user) {
  const pref = user?.sport_preference;
  if (pref && pref !== SPORT_PREF_ALL && isSportId(pref)) return pref;
  if (user?.team_sport && isSportId(user.team_sport)) return user.team_sport;
  return "volleyball";
}

/** Where to send the user after login or when visiting home. */
export function homePathForUser(user) {
  if (!user) return "/login";
  if (isAllSportsUser(user)) return "/";
  return sportPath(primarySportForUser(user));
}

export function canAccessAllSports(user) {
  return isAllSportsUser(user);
}

export function canAccessSport(user, sport) {
  if (!user || !isSportId(sport)) return false;
  if (isAllSportsUser(user)) return true;
  return primarySportForUser(user) === sport;
}

export function normalizeSportPreference(value, fallback = "volleyball") {
  if (value === SPORT_PREF_ALL) return SPORT_PREF_ALL;
  if (isSportId(value)) return value;
  return fallback;
}

export const SPORT_PREF_COOKIE = "rallyhq_sport_pref";

export const SPORT_PREF_CHOICES = [
  { value: "volleyball", label: "Volleyball only", icon: "🏐" },
  { value: "basketball", label: "Basketball only", icon: "🏀" },
  { value: "soccer", label: "Soccer only", icon: "⚽" },
  { value: SPORT_PREF_ALL, label: "All sports", icon: "🏟️" },
];
