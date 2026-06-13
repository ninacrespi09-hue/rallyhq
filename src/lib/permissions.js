import { redirect } from "next/navigation";
import { sportPath } from "./sportPaths";
import { getSportConfig } from "./sports";
import { canAccessAllSports } from "./userSportPreference";

export const ROLES = {
  COACH: "coach",
  PLAYER: "player",
  PARENT: "parent",
};

export function isCoach(user) {
  return user?.role === ROLES.COACH;
}

export function isPlayer(user) {
  return user?.role === ROLES.PLAYER;
}

export function isParent(user) {
  return user?.role === ROLES.PARENT;
}

/** Primary mobile nav — 5 tabs, matches original RallyHQ layout. */
export const NAV_PRIMARY = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/players", label: "Players", icon: "🏐" },
  { href: "/exercises", label: "Exercises", icon: "💪" },
  { href: "/ai-coach", label: "AI", icon: "🤖" },
];

export const NAV_PARENT = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/exercises", label: "Exercises", icon: "💪" },
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/players", label: "Team", icon: "🏐" },
];

export const NAV_SECONDARY = [
  { href: "/schedule/all", label: "All Sports", icon: "🗓️" },
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/stats", label: "Team Stats", icon: "📊" },
  { href: "/checkin", label: "Wellness", icon: "🩺" },
  { href: "/wellness-kit", label: "Wellness Kit", icon: "🎒" },
  { href: "/chat", label: "Chat", icon: "💬" },
];

export const NAV_SECONDARY_PARENT = [];

/** Full mobile bottom bar — matches home Explore cards + Home, AI. */
export const NAV_MOBILE = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/players", label: "Players", icon: "🏐" },
  { href: "/checkin", label: "Wellness", icon: "🩺" },
  { href: "/wellness-kit", label: "Wellness Kit", icon: "🎒" },
  { href: "/exercises", label: "Exercises", icon: "💪" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/ai-coach", label: "AI", icon: "🤖" },
];

export const NAV_MOBILE_PARENT = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/exercises", label: "Exercises", icon: "💪" },
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/players", label: "Team", icon: "🏐" },
];

function filterNavForUser(items, user) {
  if (canAccessAllSports(user)) return items;
  return items.filter((item) => item.href !== "/schedule/all");
}

export function prefixNavForSport(items, sport) {
  if (!sport) return items;
  const cfg = getSportConfig(sport);
  return items.map((item) => {
    if (item.href === "/schedule/all") return item;
    if (item.href === "/") return { ...item, href: sportPath(sport) };
    const next = { ...item, href: sportPath(sport, item.href.slice(1)) };
    if (item.label === "Players" || item.label === "Team") next.icon = cfg.icon;
    return next;
  });
}

export function navPrimaryForRole(role, sport, user) {
  const base = role === ROLES.PARENT ? NAV_PARENT : NAV_PRIMARY;
  return prefixNavForSport(filterNavForUser(base, user), sport);
}

export function navSecondaryForRole(role, sport, user) {
  const base = role === ROLES.PARENT ? NAV_SECONDARY_PARENT : NAV_SECONDARY;
  return prefixNavForSport(filterNavForUser(base, user), sport);
}

export function navMobileForRole(role, sport, user) {
  const base = role === ROLES.PARENT ? NAV_MOBILE_PARENT : NAV_MOBILE;
  return prefixNavForSport(filterNavForUser(base, user), sport);
}

const PARENT_BLOCKED_PREFIXES = [
  "/ai-coach",
  "/checkin",
  "/wellness-kit",
  "/insights",
  "/chat",
];

function stripSportPrefix(pathname) {
  return pathname.replace(/^\/(volleyball|basketball|soccer)(?=\/|$)/, "") || "/";
}

/** Redirect parents away from coach/player-only pages. */
export function guardParentPage(user, pathname) {
  if (!isParent(user)) return;
  const check = stripSportPrefix(pathname);
  if (PARENT_BLOCKED_PREFIXES.some((p) => check === p || check.startsWith(`${p}/`))) {
    redirect("/");
  }
}

export function blockParentApi(user) {
  return isParent(user);
}

export function canEditStats(user) {
  return isCoach(user);
}

export function canUploadStatSheet(user) {
  return isCoach(user);
}

export function canManageExercises(user) {
  return isCoach(user);
}

export function canEditCoachNotes(user) {
  return isCoach(user);
}

export function canViewPrivateWellness(user) {
  return isCoach(user) || isPlayer(user);
}

export function canEditEventParticipation(user) {
  return isCoach(user) || isPlayer(user);
}

/** Pre-event RSVP — players and parents (read-only accounts can still RSVP). */
export function canRsvp(user) {
  return isPlayer(user) || isParent(user);
}

export function canManageRsvp(user) {
  return isCoach(user);
}

export const RSVP_STATUSES = ["going", "maybe", "cant_go"];

export function canUploadMedia(user) {
  return !isParent(user);
}

export function canUseAiCoach(user) {
  return isCoach(user) || isPlayer(user);
}

export function canUseGroupChat(user) {
  return (isCoach(user) || isPlayer(user)) && !!user?.team_id;
}

export function canCreatePoll(user) {
  return isCoach(user);
}

/** Players only — one vote per poll. */
export function canVotePoll(user) {
  return isPlayer(user);
}

/** Coaches, players, and parents on the team can view poll results. */
export function canViewPoll(user) {
  return !!user?.team_id && (isCoach(user) || isPlayer(user) || isParent(user));
}
