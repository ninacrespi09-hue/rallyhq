import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { BarChart, LineChart, RecordDonut } from "@/components/Charts";
import PageHeader from "@/components/PageHeader";
import { teamRecord } from "@/lib/queries";
import { STATS, teamStatTotals, teamTrends, teamLeaderboard } from "@/lib/stats";
import { blockParent } from "@/lib/parentPages";

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  blockParent(user);

  const rec = teamRecord(user.team_id);
  const totals = teamStatTotals(user.team_id);
  const trends = teamTrends(user.team_id);
  const board = teamLeaderboard(user.team_id);

  const statBars = STATS.map((s) => ({ label: s.label, value: totals[s.key] }));
  const trendPoints = trends.map((t) => ({ label: t.label, value: t.points }));

  return (
    <NavShell user={user}>
      <PageHeader eyebrow="Analytics" title="Team Stats" subtitle="Season performance dashboard and analytics." />

      {user.role === "coach" && (
        <>
          <section className="card mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-navy-900">Upload Stat Sheet</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Upload a photo of your volleyball stat sheet and RallyHQ will help fill in the stats automatically.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link href="/stats/upload" className="btn-primary w-full sm:w-auto text-center">
                  Upload Stat Sheet
                </Link>
              </div>
            </div>
          </section>

          <section className="card mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-navy-900">Enter Stats Manually</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Type in match and player stats yourself, then review before saving.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link href="/stats/manual" className="btn-primary w-full sm:w-auto text-center">
                  Enter Stats Manually
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Record dashboard */}
      <div className="grid gap-4 md:grid-cols-3">
        <section className="card flex items-center justify-center">
          <RecordDonut wins={rec.wins} losses={rec.losses} />
        </section>
        <section className="card flex flex-col justify-center gap-3 md:col-span-2">
          <h2 className="font-bold text-navy-900">Season Record</h2>
          <div className="flex gap-3">
            <Stat big value={rec.wins} label="Wins" tone="text-emerald-600" />
            <Stat big value={rec.losses} label="Losses" tone="text-blue-500" />
            <Stat big value={rec.wins + rec.losses} label="Games" tone="text-navy-900" />
          </div>
          {/* Recent results */}
          <div className="flex flex-wrap gap-1.5">
            {trends.slice(-8).map((t, i) => (
              <span
                key={i}
                className={`chip ${
                  t.result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                }`}
                title={`${t.label} ${t.score}`}
              >
                {t.result} {t.score}
              </span>
            ))}
            {trends.length === 0 && <span className="text-sm text-navy-400">No games recorded yet.</span>}
          </div>
        </section>
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Team Performance Trend</h2>
          <p className="mb-2 text-xs text-navy-400">Offensive output (Kills + Serve Aces + Blocks) per game</p>
          {trendPoints.length ? (
            <LineChart points={trendPoints} />
          ) : (
            <p className="text-sm text-navy-400">No game data yet.</p>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Team Statistic Totals</h2>
          <BarChart data={statBars} />
        </section>
      </div>

      {/* Category leaders */}
      <section className="mt-4 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Category Leaders</h2>
          <Link href="/players" className="text-sm font-medium text-brand-600">
            All players →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STATS.map((s) => {
            const leader = [...board].sort((a, b) => b[s.key] - a[s.key]).filter((p) => p[s.key] > 0)[0];
            return (
              <div key={s.key} className="rounded-xl bg-navy-50/60 p-3 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wide text-navy-400">{s.label}</div>
                {leader ? (
                  <>
                    <div className="mt-1 text-lg font-extrabold text-brand-600">{leader[s.key]}</div>
                    <Link href={`/players/${leader.id}`} className="text-xs font-medium text-navy-700 hover:text-brand-600">
                      {leader.name}
                    </Link>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-navy-300">—</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </NavShell>
  );
}

function Stat({ value, label, tone, big }) {
  return (
    <div className="flex-1 rounded-xl bg-navy-50 p-3 text-center">
      <div className={`font-extrabold ${big ? "text-3xl" : "text-xl"} ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</div>
    </div>
  );
}
