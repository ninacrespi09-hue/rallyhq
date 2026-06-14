import { getSportPageContext } from "@/lib/sportPage";
import SportHome from "@/components/SportHome";

export default async function SportHubPage({ params }) {
  const { sport } = await params;
  const { user, sport: activeSport } = await getSportPageContext(sport);
  return <SportHome user={user} sport={activeSport} />;
}
