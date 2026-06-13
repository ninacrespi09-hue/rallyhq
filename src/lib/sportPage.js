import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isSportId } from "@/lib/sports";
import { resolveTeamId } from "@/lib/sportTeams";

/** Shared server context for sport-prefixed pages. */
export async function getSportPageContext(sport) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSportId(sport)) redirect("/");
  return {
    user,
    sport,
    teamId: resolveTeamId(user, sport),
  };
}
