import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { fmtDateTime, EVENT_STYLES } from "@/lib/format";
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

export default async function SchedulePage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = (await searchParams) || {};
  const view = VIEWS.find((v) => v.key === sp.view)?.key || "upcoming";
  const activeView = VIEWS.find((v) => v.key === view);

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Calendar"
        title="Schedule"
        subtitle="Practices, games, tournaments and team bonding."
        action={user.role === "coach" ? <EventCreator defaultType={activeView.type || "practice"} /> : null}
      />

      <Legend />
      <ViewTabs view={view} />

      <div className="mt-5">
        {view === "calendar" ? (
          <CalendarView monthParam={sp.month} />
        ) : activeView.type ? (
          <TypeView type={activeView.type} label={activeView.label} isCoach={user.role === "coach"} />
        ) : (
          <UpcomingView isCoach={user.role === "coach"} />
        )}
      </div>
    </NavShell>
  );
}

/* -------------------------------- Sub views -------------------------------- */

function UpcomingView({ isCoach }) {
  const db = getDb();
  const upcoming = db
    .prepare("SELECT * FROM events WHERE date(start_time) >= date('now') ORDER BY start_time ASC")
    .all();
  const past = db
    .prepare(
      `SELECT e.*, r.result, r.our_score, r.opp_score
       FROM events e LEFT JOIN game_results r ON r.event_id = e.id
       WHERE date(e.start_time) < date('now') ORDER BY e.start_time DESC LIMIT 20`
    )
    .all();

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

function TypeView({ type, label, isCoach }) {
  const db = getDb();
  const upcoming = db
    .prepare("SELECT * FROM events WHERE type = ? AND date(start_time) >= date('now') ORDER BY start_time ASC")
    .all(type);
  const past = db
    .prepare(
      `SELECT e.*, r.result, r.our_score, r.opp_score
       FROM events e LEFT JOIN game_results r ON r.event_id = e.id
       WHERE e.type = ? AND date(e.start_time) < date('now') ORDER BY e.start_time DESC`
    )
    .all(type);

  const empty = upcoming.length === 0 && past.length === 0;

  return (
    <>
      {empty && (
        <div className="card text-sm text-navy-400">
          No {label.toLowerCase()} scheduled yet.
        </div>
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

function CalendarView({ monthParam }) {
  // Determine the month to show (YYYY-MM), defaulting to the current month.
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const events = getDb().prepare("SELECT * FROM events ORDER BY start_time ASC").all();

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
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/schedule?view=calendar&month=${prev}`}
          className="btn-ghost px-3 py-1.5 text-sm"
        >
          ← Prev
        </Link>
        <h2 className="text-lg font-extrabold text-navy-900">
          {MONTHS[month]} {year}
        </h2>
        <Link
          href={`/schedule?view=calendar&month=${next}`}
          className="btn-ghost px-3 py-1.5 text-sm"
        >
          Next →
        </Link>
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
                  const s = EVENT_STYLES[e.type] || EVENT_STYLES.practice;
                  return (
                    <Link
                      key={e.id}
                      href={`/schedule/${e.id}`}
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
    </div>
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
          <Link
            key={v.key}
            href={href}
            className={`chip ring-1 transition ${
              active
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-navy-600 ring-navy-100 hover:bg-navy-50"
            }`}
          >
            {v.label}
          </Link>
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
          <span className={`h-2.5 w-2.5 rounded-full ${EVENT_STYLES[type].dot}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

function EventRow({ e, past, isCoach }) {
  const s = EVENT_STYLES[e.type] || EVENT_STYLES.practice;
  return (
    <div className={`card flex items-center gap-3 ${s.ring} ${s.bg}`}>
      <Link href={`/schedule/${e.id}`} className="flex flex-1 items-center gap-3 min-w-0">
        <span className={`h-10 w-1.5 shrink-0 rounded-full ${s.bar}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-navy-800">{e.title}</span>
            <span className={`chip ${s.chip}`}>{s.label}</span>
          </div>
          <div className="text-xs text-navy-400">
            {fmtDateTime(e.start_time)}
            {e.location ? ` · ${e.location}` : ""}
          </div>
        </div>
        {past && e.result && (
          <span className={`chip ${e.result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
            {e.result} {e.our_score}-{e.opp_score}
          </span>
        )}
      </Link>
      {isCoach && <QuickDelete id={e.id} />}
    </div>
  );
}
