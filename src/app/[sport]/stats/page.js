import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import { statsForSport } from "@/lib/statDefs";
import { getSportConfig } from "@/lib/sports";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, LineChart, RecordDonut } from "@/components/Charts";
import PageHeader from "@/components/PageHeader";
import { teamRecord } from "@/lib/queries";
import { teamStatTotals, teamTrends, teamLeaderboard } from "@/lib/stats";
export default async function StatsPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);

  const STATS = statsForSport(sport);
  const cfg = getSportConfig(sport);

  const rec = teamRecord(teamId);
  const totals = teamStatTotals(teamId);
  const trends = teamTrends(teamId);
  const board = teamLeaderboard(teamId);

  const statBars = STATS.map((s) => ({ label: s.label, value: totals[s.key] }));
  const trendPoints = trends.map((t) => ({ label: t.label, value: t.points }));

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader eyebrow="Analytics" title="Team Stats" subtitle="Season performance dashboard and analytics." />

      {user.role === "coach" && (
        <>
          <Card className="mt-4">
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-navy-900">Upload Stat Sheet</h2>
                  <p className="mt-1 text-sm text-navy-500">
                    Upload a photo of your {cfg.label.toLowerCase()} stat sheet and RallyHQ will help fill in the stats automatically.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={sportPath(sport, "stats/upload")}>Upload Stat Sheet</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold text-navy-900">Enter Stats Manually</h2>
                  <p className="mt-1 text-sm text-navy-500">
                    Type in match and player stats yourself, then review before saving.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={sportPath(sport, "stats/manual")}>Enter Stats Manually</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Record dashboard */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-center">
            <RecordDonut wins={rec.wins} losses={rec.losses} />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="flex flex-col justify-center gap-3">
            <h2 className="font-bold text-navy-900">Season Record</h2>
            <div className="flex gap-3">
              <Stat big value={rec.wins} label="Wins" tone="text-emerald-600" />
              <Stat big value={rec.losses} label="Losses" tone="text-blue-500" />
              <Stat big value={rec.wins + rec.losses} label="Games" tone="text-navy-900" />
            </div>
            {/* Recent results */}
            <div className="flex flex-wrap gap-1.5">
              {trends.slice(-8).map((t, i) => (
                <Badge
                  key={i}
                  className={t.result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}
                  title={`${t.label} ${t.score}`}
                >
                  {t.result} {t.score}
                </Badge>
              ))}
              {trends.length === 0 && <span className="text-sm text-navy-400">No games recorded yet.</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="mb-3 font-bold text-navy-900">Team Performance Trend</h2>
            <p className="mb-2 text-xs text-navy-400">{cfg.label} team output per game</p>
            {trendPoints.length ? (
              <LineChart points={trendPoints} />
            ) : (
              <p className="text-sm text-navy-400">No game data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="mb-3 font-bold text-navy-900">Team Statistic Totals</h2>
            <BarChart data={statBars} />
          </CardContent>
        </Card>
      </div>

      {/* Category leaders */}
      <Card className="mt-4">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Category Leaders</h2>
            <Link href={sportPath(sport, "players")} className="text-sm font-medium text-brand-600">
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
                      <Link href={sportPath(sport, `players/${leader.id}`)} className="text-xs font-medium text-navy-700 hover:text-brand-600">
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
        </CardContent>
      </Card>
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
