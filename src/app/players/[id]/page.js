import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { userTeamId } from "@/lib/tenancy";
import NavShell from "@/components/NavShell";
import Avatar from "@/components/Avatar";
import CoachNotes from "@/components/CoachNotes";
import { BarChart, LineChart, Ring } from "@/components/Charts";
import { getDb } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import {
  STATS,
  statTotals,
  recentGames,
  attendancePct,
  wellnessScore,
  wellnessHistory,
  injuryHistory,
  strengthsAndImprovements,
} from "@/lib/stats";

export default async function PlayerProfile({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const db = getDb();
  const player = db
    .prepare("SELECT id, name, position, jersey_number, height_cm, bio, photo_url FROM users WHERE id = ? AND role='player'")
    .get(Number(id));
  if (!player) notFound();
  if (userTeamId(player.id) !== user.team_id) notFound();

  const totals = statTotals(player.id);
  const games = recentGames(player.id, 8);
  const attendance = attendancePct(player.id);
  const wellness = wellnessScore(player.id);
  const wHistory = wellnessHistory(player.id);
  const injuries = injuryHistory(player.id);
  const { strengths, improvements } = strengthsAndImprovements(player.id, user.team_id);
  const notes = db
    .prepare(
      `SELECT n.*, u.name AS author FROM player_notes n LEFT JOIN users u ON u.id = n.author_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC`
    )
    .all(player.id);

  const statBars = STATS.map((s) => ({ label: s.label, value: totals[s.key] }));
  const trend = [...games]
    .reverse()
    .map((g) => ({ label: g.opponent || fmtDate(g.start_time), value: g.kills }));

  return (
    <NavShell user={user}>
      <Link href="/players" className="text-sm font-medium text-brand-600">
        ← Back to Roster
      </Link>

      {/* Header */}
      <div className="mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-navy-900 p-6 text-white shadow-soft">
        <div className="flex items-center gap-4">
          <Avatar user={player} size={84} className="ring-4 ring-white/20" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-black">{player.name}</h1>
              {player.jersey_number != null && (
                <span className="chip bg-white/20 text-white">#{player.jersey_number}</span>
              )}
            </div>
            <div className="mt-1 text-sm text-blue-100">{player.position || "Player"}</div>
            {player.height_cm ? <div className="text-xs text-blue-200">{player.height_cm} cm</div> : null}
          </div>
        </div>
        {player.bio && <p className="mt-4 text-sm text-blue-50/90">{player.bio}</p>}
      </div>

      {/* Quick metrics */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Games" value={totals.games} />
        <MetricRing label="Attendance" value={attendance} suffix="%" color="#0ea5e9" />
        <MetricRing label="Wellness" value={wellness} color="#10b981" />
      </div>

      {/* Season statistics (full names) */}
      <section className="mt-4 card">
        <h2 className="mb-3 font-bold text-navy-900">Season Statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATS.map((s) => (
            <div key={s.key} className="rounded-xl bg-navy-50 p-3 text-center">
              <div className="text-2xl font-extrabold text-navy-900">{totals[s.key]}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Statistic Breakdown</h2>
          <BarChart data={statBars} />
        </section>
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Kills Trend (recent games)</h2>
          {trend.length ? <LineChart points={trend} /> : <p className="text-sm text-navy-400">No games yet.</p>}
        </section>
      </div>

      {/* Strengths + improvements */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-2 font-bold text-emerald-700">💪 Strengths</h2>
          <ul className="space-y-1.5 text-sm text-navy-700">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2"><span>✓</span>{s}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="mb-2 font-bold text-blue-700">🎯 Areas for Improvement</h2>
          <ul className="space-y-1.5 text-sm text-navy-700">
            {improvements.map((s, i) => (
              <li key={i} className="flex gap-2"><span>↗</span>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent game statistics */}
      <section className="mt-4 card overflow-x-auto">
        <h2 className="mb-3 font-bold text-navy-900">Recent Game Statistics</h2>
        {games.length === 0 ? (
          <p className="text-sm text-navy-400">No games recorded yet.</p>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="py-2">Game</th>
                {STATS.map((s) => (
                  <th key={s.key} className="px-2 text-center">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id} className="border-t border-navy-100">
                  <td className="py-2">
                    <div className="font-medium text-navy-800">{g.opponent || g.title}</div>
                    <div className="text-xs text-navy-400">{fmtDate(g.start_time)}</div>
                  </td>
                  {STATS.map((s) => (
                    <td key={s.key} className="px-2 text-center text-navy-600">{g[s.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Wellness + injury history */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Wellness History</h2>
          {wHistory.length === 0 ? (
            <p className="text-sm text-navy-400">No check-ins yet.</p>
          ) : (
            <div className="space-y-1.5">
              {wHistory.map((w) => (
                <div key={w.date} className="flex items-center gap-2 rounded-lg bg-navy-50/60 px-3 py-1.5 text-xs">
                  <span className="w-20 font-medium text-navy-600">{w.date}</span>
                  <span className="text-navy-500">Energy {w.energy} · Soreness {w.soreness} · Mood {w.mood}</span>
                  {w.injury ? <span className="ml-auto chip bg-blue-100 text-blue-700">injury</span> : null}
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3 font-bold text-navy-900">Injury History</h2>
          {injuries.length === 0 ? (
            <p className="text-sm text-emerald-700">✓ No injuries reported.</p>
          ) : (
            <div className="space-y-2">
              {injuries.map((inj, i) => (
                <div key={i} className="rounded-lg bg-blue-50 px-3 py-2 text-sm ring-1 ring-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-700">{inj.areas || "Injury"}</span>
                    <span className="ml-auto text-xs text-navy-400">{inj.date}</span>
                  </div>
                  {inj.note && <p className="mt-0.5 text-xs text-navy-600">{inj.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Coach notes */}
      <section className="mt-4 card">
        <h2 className="mb-3 font-bold text-navy-900">📋 Coach Notes</h2>
        <CoachNotes playerId={player.id} notes={notes} canEdit={user.role === "coach"} />
      </section>
    </NavShell>
  );
}

function Metric({ label, value }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-extrabold text-navy-900">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</div>
    </div>
  );
}

function MetricRing({ label, value, color, suffix = "" }) {
  return (
    <div className="card flex flex-col items-center justify-center">
      {value == null ? (
        <div className="text-sm text-navy-400">No data</div>
      ) : (
        <Ring value={value} color={color} size={60} label={`${value}${suffix}`} />
      )}
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-navy-400">{label}</div>
    </div>
  );
}
