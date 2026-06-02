import { redirect } from "next/navigation";

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
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/players", label: "Team", icon: "🏐" },
];

export const NAV_SECONDARY = [
  { href: "/gallery", label: "Gallery", icon: "📷" },
  { href: "/stats", label: "Team Stats", icon: "📊" },
  { href: "/checkin", label: "Wellness", icon: "🩺" },
  { href: "/chat", label: "Chat", icon: "💬" },
  { href: "/dashboard", label: "Dashboard", icon: "📋" },
];

export const NAV_SECONDARY_PARENT = [
  { href: "/dashboard", label: "Dashboard", icon: "📋" },
];

export function navPrimaryForRole(role) {
  return role === ROLES.PARENT ? NAV_PARENT : NAV_PRIMARY;
}

export function navSecondaryForRole(role) {
  return role === ROLES.PARENT ? NAV_SECONDARY_PARENT : NAV_SECONDARY;
}

const PARENT_BLOCKED_PREFIXES = [
  "/stats",
  "/exercises",
  "/ai-coach",
  "/checkin",
  "/insights",
  "/chat",
];

/** Redirect parents away from coach/player-only pages. */
export function guardParentPage(user, pathname) {
  if (!isParent(user)) return;
  if (PARENT_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
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

/** Pre-event RSVP — players only (not parents or coaches). */
export function canRsvp(user) {
  return isPlayer(user);
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
