import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import AICoachPanel from "@/components/AICoachPanel";
import { getLatestPlayerCoachInsight } from "@/lib/playerCoachInsight";
import { teamPlayerIds } from "@/lib/playerCoachData";

export default async function AICoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "player") {
    const insight = getLatestPlayerCoachInsight(user.id);
    return (
      <NavShell user={user}>
        <PageHeader
          eyebrow="AI Coach"
          title="Your AI Coach"
          subtitle="Personal insights from your stats, wellness check-ins, exercises, and attendance — only you can see this."
        />
        <AICoachPanel role="player" initialPlayer={{ id: user.id, name: user.name, insight }} />
      </NavShell>
    );
  }

  const roster = teamPlayerIds(user.team_id);
  const players = roster.map((p) => ({
    ...p,
    insight: getLatestPlayerCoachInsight(p.id),
  }));

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="AI Coach"
        title="Team AI Coach"
        subtitle="See strengths, weaknesses, habit impact, and improvement tips for every player on your roster."
      />
      <AICoachPanel role="coach" initialPlayers={players} />
    </NavShell>
  );
}
