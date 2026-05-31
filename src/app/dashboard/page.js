import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import {
  playerStatTotals,
  teamRecord,
  upcomingEvents,
  todaysCheckin,
  leaderboard,
  allPlayers,
  teamWellness,
} from "@/lib/queries";
import { getDb } from "@/lib/db";
import { fmtDateTime, EVENT_STYLES } from "@/lib/format";
import { LEVEL_STYLE } from "@/lib/wellness";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const events = upcomingEvents(4, user.team_id);
  const pinned = getDb()
    .prepare(
      `SELECT a.* FROM announcements a JOIN users u ON u.id = a.author_id
       WHERE u.team_id = ? ORDER BY a.pinned DESC, a.created_at DESC LIMIT 3`
    )
    .all(user.team_id);

  return (
    <NavShell user={user}>
      <div className="mb-6">
        <Link href="/" className="text-sm font-medium text-brand-600">
          ← Home
        </Link>
        <p className="mt-2 text-sm text-navy-400">{greeting()},</p>
        <h1 className="text-2xl font-extrabold text-navy-900">{user.name.split(" ")[0]} 🏐</h1>
      </div>

      {user.role === "coach" ? <CoachHome user={user} /> : <PlayerHome user={user} />}

      {/* Shared: upcoming + announcements */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Upcoming</h2>
            <Link href="/schedule" className="text-sm font-medium text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {events.length === 0 && <p className="text-sm text-navy-400">Nothing scheduled yet.</p>}
            {events.map((e) => {
              const s = EVENT_STYLES[e.type];
              return (
                <Link
                  key={e.id}
                  href={`/schedule/${e.id}`}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-navy-50"
                >
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold text-navy-800">{e.title}</div>
                    <div className="text-xs text-navy-400">{fmtDateTime(e.start_time)}</div>
                  </div>
                  <span className={`chip ${s.chip}`}>{s.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Team board</h2>
            <Link href="/announcements" className="text-sm font-medium text-brand-600">
              View all
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {pinned.length === 0 && <p className="text-sm text-navy-400">No announcements yet.</p>}
            {pinned.map((a) => (
              <div key={a.id} className="rounded-xl p-2">
                <div className="flex items-center gap-2">
                  {a.pinned ? <span>📌</span> : null}
                  <span className="text-sm font-semibold text-navy-800">{a.title}</span>
                </div>
                <p className="line-clamp-2 text-xs text-navy-500">{a.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </NavShell>
  );
}

function PlayerHome({ user }) {
  const totals = playerStatTotals(user.id);
  const checkin = todaysCheckin(user.id);

  return (
    <div className="space-y-4">
      {!checkin && (
        <Link href="/checkin" className="block rounded-2xl bg-brand-600 p-5 text-white shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium opacity-90">Daily check-in</div>
              <div className="text-lg font-bold">How are you feeling today?</div>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </Link>
      )}
      {checkin && (
        <div className="card flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-navy-800">✅ Checked in today</div>
            <div className="text-xs text-navy-400">
              Soreness {checkin.soreness}/5 · Energy {checkin.energy}/5 · Mood {checkin.mood}/5
            </div>
          </div>
          <Link href="/checkin" className="text-sm font-medium text-brand-600">
            Update
          </Link>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-bold text-navy-900">My season</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <Stat label="Games" value={totals.games} />
          <Stat label="Kills" value={totals.kills} />
          <Stat label="Assists" value={totals.assists} />
          <Stat label="Aces" value={totals.aces} />
          <Stat label="Digs" value={totals.digs} />
          <Stat label="Blocks" value={totals.blocks} />
        </div>
      </div>
    </div>
  );
}

function CoachHome({ user }) {
  const rec = teamRecord(user.team_id);
  const players = allPlayers(user.team_id);
  const wellness = teamWellness(user.team_id);
  const checkedInToday = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM checkins c JOIN users u ON u.id = c.user_id
       WHERE u.team_id = ? AND c.date = date('now')`
    )
    .get(user.team_id).n;
  const injuries = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM checkins c JOIN users u ON u.id = c.user_id
       WHERE u.team_id = ? AND c.date >= date('now','-7 days') AND c.injury = 1`
    )
    .get(user.team_id).n;
  const topScorer = leaderboard("kills", 1, user.team_id)[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Record" value={`${rec.wins}-${rec.losses}`} hint="W–L" />
        <KpiCard label="Roster" value={players.length} hint="players" />
        <KpiCard
          label="Checked in"
          value={`${checkedInToday}/${players.length}`}
          hint="today"
          accent={checkedInToday < players.length}
        />
        <KpiCard label="Injury flags" value={injuries} hint="last 7 days" accent={injuries > 0} />
      </div>

      <WellnessSummary wellness={wellness} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/insights" className="card flex items-center justify-between hover:ring-brand-200">
          <div>
            <div className="text-sm font-semibold text-navy-800">🤖 AI player insights</div>
            <div className="text-xs text-navy-400">Spot soreness & energy trends across the team</div>
          </div>
          <span className="text-xl">→</span>
        </Link>
        <Link href="/schedule" className="card flex items-center justify-between hover:ring-brand-200">
          <div>
            <div className="text-sm font-semibold text-navy-800">📅 Schedule an event</div>
            <div className="text-xs text-navy-400">Add a practice, game, or tournament</div>
          </div>
          <span className="text-xl">→</span>
        </Link>
      </div>

      {topScorer && (
        <div className="card">
          <h2 className="mb-1 font-bold text-navy-900">Team leader — kills</h2>
          <p className="text-sm text-navy-500">
            <b className="text-navy-800">{topScorer.name}</b> ({topScorer.position}) with{" "}
            <b className="text-brand-600">{topScorer.total}</b> kills this season.
          </p>
        </div>
      )}
    </div>
  );
}

function WellnessSummary({ wellness }) {
  const { players, needRest, monitor } = wellness;

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy-900">🩺 Team wellness</h2>
        <Link href="/schedule" className="text-sm font-medium text-brand-600">
          From latest games
        </Link>
      </div>

      {players.length === 0 ? (
        <p className="mt-3 text-sm text-navy-400">
          No post-game wellness submitted yet. Players can check in from a game's page after they play.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <SummaryPill tone="rest" count={needRest.length} label="need rest" />
            <SummaryPill tone="monitor" count={monitor.length} label="to monitor" />
            <SummaryPill
              tone="ok"
              count={players.length - needRest.length - monitor.length}
              label="good to go"
            />
          </div>

          {needRest.length + monitor.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700">✓ Everyone is recovering well.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {[...needRest, ...monitor].slice(0, 5).map((p) => {
                const st = LEVEL_STYLE[p.level];
                return (
                  <div key={p.user_id} className="flex items-center gap-2 rounded-xl bg-navy-50/60 p-2.5">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                    <span className="text-sm font-semibold text-navy-800">{p.name}</span>
                    <span className={`chip ${st.chip}`}>{st.label}</span>
                    <span className="ml-auto truncate text-xs text-navy-400">
                      {p.reasons.slice(0, 2).join(" · ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SummaryPill({ tone, count, label }) {
  const style = LEVEL_STYLE[tone];
  return (
    <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${style.chip}`}>
      <span className="text-base font-extrabold">{count}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-navy-50 p-3 text-center">
      <div className="text-xl font-extrabold text-navy-900">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</div>
    </div>
  );
}

function KpiCard({ label, value, hint, accent }) {
  return (
    <div className={`card ${accent ? "ring-blue-200" : ""}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${accent ? "text-blue-600" : "text-navy-900"}`}>
        {value}
      </div>
      <div className="text-xs text-navy-400">{hint}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
