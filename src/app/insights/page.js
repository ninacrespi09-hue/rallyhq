import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import InsightsPanel from "@/components/InsightsPanel";
import PageHeader from "@/components/PageHeader";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const scope = user.role === "coach" ? "team" : "player";
  const last = getDb()
    .prepare(
      `SELECT * FROM ai_insights WHERE scope = ? AND (user_id IS ? OR user_id = ?)
       ORDER BY generated_at DESC LIMIT 1`
    )
    .get(scope, scope === "team" ? null : user.id, user.id);

  const initial = last
    ? {
        summary: last.summary,
        flags: JSON.parse(last.details_json || "[]"),
        source: last.source,
        generated_at: last.generated_at,
      }
    : null;

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Intelligence"
        title="🤖 AI insights"
        subtitle={
          scope === "team"
            ? "Trends across your team's recent check-ins: soreness, energy, mood, and injury risk."
            : "A look at your own recent check-in trends."
        }
      />
      <InsightsPanel initial={initial} scope={scope} />
    </NavShell>
  );
}
