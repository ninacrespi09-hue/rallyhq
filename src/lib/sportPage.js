import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSportId } from "@/lib/sports";
import { resolveTeamId, getTeamIdForSport } from "@/lib/sportTeams";
import { canAccessSport, homePathForUser } from "@/lib/userSportPreference";

function userCanAccessSport(user, sport) {
  if (canAccessSport(user, sport)) return true;
  // Coaches/players linked to a team in this sport can open that sport hub.
  return !!getTeamIdForSport(user.id, sport);
}

/** Shared server context for sport-prefixed pages. */
export async function getSportPageContext(sport) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSportId(sport)) redirect("/");
  if (!userCanAccessSport(user, sport)) redirect(homePathForUser(user));
  return {
    user,
    sport,
    teamId: resolveTeamId(user, sport),
  };
}
