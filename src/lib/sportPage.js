import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSportId } from "@/lib/sports";
import { resolveTeamId } from "@/lib/sportTeams";
import { canAccessSport, homePathForUser } from "@/lib/userSportPreference";

/** Shared server context for sport-prefixed pages. */
export async function getSportPageContext(sport) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSportId(sport)) redirect("/");
  if (!canAccessSport(user, sport)) redirect(homePathForUser(user));
  return {
    user,
    sport,
    teamId: resolveTeamId(user, sport),
  };
}
