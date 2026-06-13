import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db";
import { fmtDateTime, getEventStyle } from "@/lib/format";
import EventCreator from "@/components/EventCreator";
import PageHeader from "@/components/PageHeader";
import QuickDelete from "@/components/QuickDelete";

const VIEWS = [
  { key: "upcoming",      label: "Upcoming",      type: null },
  { key: "practices",     label: "Practices",     type: "practice" },
  { key: "conditioning",  label: "Conditioning",  type: "conditioning" },
  { key: "tournaments",   label: "Tournaments",   type: "tournament" },
  { key: "bonding",       label: "Team Bonding",  type: "bonding" },
  { key: "calendar",      label: "Calendar",      type: null },
];

export default async function SchedulePage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);

  const sp = (await searchParams) || {};
  const view = VIEWS.find((v) => v.key === sp.view)?.key || "upcoming";
  const activeView = VIEWS.find((v) => v.key === view);

  return (
    <NavShell user={user} sport={sport}>
      <PageHeader
        eyebrow="Calendar"
        title="Schedule"
        subtitle="Practices, games, tournaments and team bonding."
        action={user.role === "coach" ? <EventCreator defaultType={activeView.type || "practice"} /> : null}
      />

      {user.role === "coach" && (
        <Card className="mt-4">
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-navy-900">Upload Schedule</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Upload a photo of your schedule and RallyHQ will help fill in upcoming events automatically.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button asChild className="w-full sm:w-auto">
                  <Link href={sportPath(sport, "schedule/upload")}>Upload Schedule Photo</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Legend />
      <ViewTabs view={view} />

      <div className="mt-5">
        {view === "calendar" ? (
          <CalendarView monthParam={sp.month} teamId={teamId} />
        ) : activeView.type ? (
          <TypeView type={activeView.type} label={activeView.label} isCoach={user.role === "coach"} teamId={teamId} />
        ) : (
          <UpcomingView isCoach={user.role === "coach"} teamId={teamId} />
        )}
      </div>
    </NavShell>
  );
}

/* -------------------------------- Sub views -------------------------------- */

function UpcomingView({ isCoach, teamId }) {
  const db = getDb();
  const teamFilter = teamId
    ? "JOIN users u ON u.id = e.created_by WHERE u.team_id = ? AND"
    : "WHERE";
  const upcoming = db
    .prepare(
      `SELECT e.* FROM events e ${teamFilter} date(e.start_time) >= date('now') ORDER BY e.start_time ASC LIMIT 40`
    )
    .all(...(teamId ? [teamId] : []));
  const past = db
    .prepare(
      `SELECT e.*, r.result, r.our_score, r.opp_score
       FROM events e LEFT JOIN game_results r ON r.event_id = e.id
       ${teamId ? "JOIN users u ON u.id = e.created_by" : ""}
       WHERE ${teamId ? "u.team_id = ? AND" : ""} date(e.start_time) < date('now') ORDER BY e.start_time DESC LIMIT 20`
    )
    .all(...(teamId ? [teamId] : []));

  return (
    <>
      <h2 className="h-section mb-2">Upcoming</h2>
      <div className="space-y-2">
        {upcoming.length === 0 && <p className="text-sm text-navy-400">No upcoming events.</p>}
        {upcoming.map((e) => (
          <EventRow key={e.id} e={e} isCoach={isCoach} />
        ))}
      </div>

      <h2 className="h-section mb-2 mt-8">Past</h2>
      <div className="space-y-2">
        {past.length === 0 && <p className="text-sm text-navy-400">No past events.</p>}
        {past.map((e) => (
          <EventRow key={e.id} e={e} past isCoach={isCoach} />
        ))}
      </div>
    </>
  );
}

function TypeView({ type, label, isCoach, teamId }) {
  const db = getDb();
  const teamJoin = teamId ? "JOIN users u ON u.id = e.created_by" : "";
  const teamWhere = teamId ? "u.team_id = ? AND" : "";
  const upcoming = db
    .prepare(
      `SELECT e.* FROM events e ${teamJoin}
       WHERE ${teamWhere} e.type = ? AND date(e.start_time) >= date('now') ORDER BY e.start_time ASC LIMIT 40`
    )
    .all(...(teamId ? [teamId, type] : [type]));
  const past = db
    .prepare(
      `SELECT e.*, r.result, r.our_score, r.opp_score
       FROM events e LEFT JOIN game_results r ON r.event_id = e.id
       ${teamJoin}
       WHERE ${teamWhere} e.type = ? AND date(e.start_time) < date('now') ORDER BY e.start_time DESC LIMIT 20`
    )
    .all(...(teamId ? [teamId, type] : [type]));

  const empty = upcoming.length === 0 && past.length === 0;

  return (
    <>
      {empty && (
        <Card>
          <CardContent className="text-sm text-navy-400">
            No {label.toLowerCase()} scheduled yet.
          </CardContent>
        </Card>
      )}
      {upcoming.length > 0 && (
        <>
          <h2 className="h-section mb-2">Upcoming {label.toLowerCase()}</h2>
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} e={e} isCoach={isCoach} />
            ))}
          </div>
        </>
      )}
      {past.length > 0 && (
        <>
          <h2 className="h-section mb-2 mt-8">Past {label.toLowerCase()}</h2>
          <div className="space-y-2">
            {past.map((e) => (
              <EventRow key={e.id} e={e} past isCoach={isCoach} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* -------------------------------- Calendar -------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarView({ monthParam, teamId }) {
  // Determine the month to show (YYYY-MM), defaulting to the current month.
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd =
    month === 11
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 2).padStart(2, "0")}-01`;

  const events = teamId
    ? getDb()
        .prepare(
          `SELECT e.* FROM events e JOIN users u ON u.id = e.created_by
           WHERE u.team_id = ? AND e.start_time >= ? AND e.start_time < ?
           ORDER BY e.start_time ASC`
        )
        .all(teamId, monthStart, monthEnd)
    : getDb()
        .prepare(
          `SELECT * FROM events WHERE start_time >= ? AND start_time < ? ORDER BY start_time ASC`
        )
        .all(monthStart, monthEnd);

  // Bucket events by day-of-month, using the local date of each event.
  const byDay = {};
  for (const e of events) {
    const d = new Date(e.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      (byDay[d.getDate()] ||= []).push(e);
    }
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayIsThisMonth = now.getFullYear() === year && now.getMonth() === month;
  const today = now.getDate();

  const prev = month === 0 ? `${year - 1}-12` : `${year}-${String(month).padStart(2, "0")}`;
  const next = month === 11 ? `${year + 1}-01` : `${year}-${String(month + 2).padStart(2, "0")}`;

  return (
    <Card>
      <CardContent>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/schedule?view=calendar&month=${prev}`}>← Prev</Link>
        </Button>
        <h2 className="text-lg font-extrabold text-navy-900">
          {MONTHS[month]} {year}
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/schedule?view=calendar&month=${next}`}>Next →</Link>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-[10px] font-bold uppercase tracking-wide text-navy-400 sm:text-xs">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const dayEvents = byDay[day] || [];
          const isToday = todayIsThisMonth && day === today;
          return (
            <div
              key={day}
              className={`min-h-[64px] rounded-xl p-1 text-left ring-1 sm:min-h-[88px] ${
                isToday ? "bg-brand-50 ring-brand-300" : "bg-navy-50/40 ring-navy-100"
              }`}
            >
              <div className={`px-1 text-[11px] font-semibold ${isToday ? "text-brand-700" : "text-navy-500"}`}>
                {day}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => {
                  const s = getEventStyle(e.type);
                  return (
                    <Link
                      key={e.id}
                      href={sportPath(sport, `schedule/${e.id}`)}
                      className={`flex items-center gap-1 rounded-md px-1 py-0.5 ${s.chip}`}
                      title={e.title}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                      <span className="truncate text-[10px] font-medium leading-tight">{e.title}</span>
                    </Link>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[9px] text-navy-400">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Pieces --------------------------------- */

function ViewTabs({ view }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {VIEWS.map((v) => {
        const href = v.key === "upcoming" ? "/schedule" : `/schedule?view=${v.key}`;
        const active = view === v.key;
        return (
          <Button
            key={v.key}
            variant={active ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            asChild
          >
            <Link href={href}>{v.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}

function Legend() {
  const items = [
    ["practice", "Practice"],
    ["tournament", "Tournament"],
    ["bonding", "Team Bonding"],
    ["game", "Game"],
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-navy-500">
      {items.map(([type, label]) => (
        <span key={type} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${getEventStyle(type).dot}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EventRow({ e, past, isCoach }) {
  const s = getEventStyle(e.type);
  return (
    <Card className={`flex items-center gap-3 ${s.ring} ${s.bg}`}>
      <CardContent className="flex w-full items-center gap-3">
        <Link href={sportPath(sport, `schedule/${e.id}`)} className="flex min-w-0 flex-1 items-center gap-3">
          <span className={`h-10 w-1.5 shrink-0 rounded-full ${s.bar}`} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-navy-800">{e.title}</span>
              <Badge className={s.chip}>{s.label}</Badge>
            </div>
            <div className="text-xs text-navy-400">
              {fmtDateTime(e.start_time)}
              {e.location ? ` · ${e.location}` : ""}
            </div>
          </div>
          {past && e.result && (
            <Badge className={e.result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
              {e.result} {e.our_score}-{e.opp_score}
            </Badge>
          )}
        </Link>
        {isCoach && <QuickDelete id={e.id} />}
      </CardContent>
    </Card>
  );
}
