import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import InsightsPanel from "@/components/InsightsPanel";

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
      <h1 className="text-2xl font-extrabold text-slate-900">🤖 AI insights</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {scope === "team"
          ? "Trends across your team's recent check-ins — soreness, energy, mood, and injury risk."
          : "A look at your own recent check-in trends."}
      </p>
      <InsightsPanel initial={initial} scope={scope} />
    </NavShell>
  );
}
