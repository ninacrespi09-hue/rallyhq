import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import dynamic from "next/dynamic";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import { getLatestPlayerCoachInsight, getLatestPlayerCoachInsights } from "@/lib/playerCoachInsight";
import { teamPlayerIds } from "@/lib/playerCoachData";
import { blockParent } from "@/lib/parentPages";

const AICoachPanel = dynamic(() => import("@/components/AICoachPanel"));

export default async function AICoachPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  blockParent(user);

  if (user.role === "player") {
    const insight = getLatestPlayerCoachInsight(user.id);
    return (
      <NavShell user={user} sport={sport}>
        <PageHeader
          eyebrow="AI Coach"
          title="Your AI Coach"
          subtitle="Personal insights from your stats, wellness check-ins, exercises, and attendance — only you can see this."
        />
        <AICoachPanel role="player" sport={sport} initialPlayer={{ id: user.id, name: user.name, insight }} />
      </NavShell>
    );
  }

  const roster = teamPlayerIds(teamId);
  const insightMap = getLatestPlayerCoachInsights(roster.map((p) => p.id));
  const players = roster.map((p) => ({
    ...p,
    insight: insightMap[p.id] ?? null,
  }));

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="AI Coach"
        title="Team AI Coach"
        subtitle="See strengths, weaknesses, habit impact, and improvement tips for every player on your roster."
      />
      <AICoachPanel role="coach" initialPlayers={players} />
    </NavShell>
  );
}
