import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { allSportEvents } from "@/lib/queries";
import { fmtDateTime, getEventStyle } from "@/lib/format";
import { getSportConfig, SPORT_IDS } from "@/lib/sports";
import { sportPath } from "@/lib/sportPaths";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "volleyball", label: "Volleyball" },
  { key: "basketball", label: "Basketball" },
  { key: "soccer", label: "Soccer" },
];

const VIEWS = [
  { key: "list", label: "List" },
  { key: "calendar", label: "Calendar" },
];

const SPORT_BADGE = {
  volleyball: "bg-sky-100 text-sky-800",
  basketball: "bg-orange-100 text-orange-800",
  soccer: "bg-emerald-100 text-emerald-800",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function filterHref(sport, view, month, type) {
  const params = new URLSearchParams();
  if (sport && sport !== "all") params.set("sport", sport);
  if (view && view !== "list") params.set("view", view);
  if (month) params.set("month", month);
  if (type && type !== "all") params.set("type", type);
  const q = params.toString();
  return q ? `/schedule/all?${q}` : "/schedule/all";
}

const TYPE_FILTERS = [
  { key: "game", label: "Game" },
  { key: "practice", label: "Practice" },
];

export default async function AllSportsSchedulePage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = (await searchParams) || {};
  const filter = SPORT_IDS.includes(sp.sport) || sp.sport === "all" ? sp.sport : "all";
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view : "list";
  const typeFilter = TYPE_FILTERS.some((t) => t.key === sp.type) ? sp.type : "all";
  const events = allSportEvents(user.id, filter)
    .filter((e) => e.type === "game" || e.type === "practice")
    .filter((e) => typeFilter === "all" || e.type === typeFilter);
  const upcoming = events.filter((e) => new Date(e.start_time) >= new Date(new Date().toDateString()));
  const past = events.filter((e) => new Date(e.start_time) < new Date(new Date().toDateString()));

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Calendar"
        title="All Sports Schedule"
        subtitle="Games and practices across volleyball, basketball, and soccer."
      />

      <Link href="/" className="mb-4 inline-block text-sm font-medium text-brand-600">
        ← Choose a sport
      </Link>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={filterHref(f.key, view, sp.month, typeFilter)}>
            <Badge
              className={`cursor-pointer px-3 py-1.5 ${
                filter === f.key ? "bg-brand-600 text-white" : "bg-navy-50 text-navy-600"
              }`}
            >
              {f.key !== "all" ? `${getSportConfig(f.key).icon} ` : ""}
              {f.label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const active = view === v.key;
          return (
            <Button
              key={v.key}
              variant={active ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              asChild
            >
              <Link href={filterHref(filter, v.key, sp.month, typeFilter)}>{v.label}</Link>
            </Button>
          );
        })}
      </div>

      <Legend sport={filter} view={view} month={sp.month} typeFilter={typeFilter} />

      {typeFilter !== "all" && (
        <p className="mt-2 text-xs text-navy-500">
          Showing {TYPE_FILTERS.find((t) => t.key === typeFilter)?.label.toLowerCase()}s only.{" "}
          <Link href={filterHref(filter, view, sp.month, "all")} className="font-semibold text-brand-600">
            Show all types
          </Link>
        </p>
      )}

      {view === "calendar" ? (
        <AllSportsCalendarView
          events={events}
          monthParam={sp.month}
          sport={filter}
          typeFilter={typeFilter}
        />
      ) : (
        <>
          <Card className="mt-5">
            <CardContent className="p-5">
              <h2 className="mb-3 font-bold text-navy-900">Upcoming</h2>
              {upcoming.length === 0 ? (
                <p className="text-sm text-navy-400">No upcoming events for this filter.</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="p-5">
              <h2 className="mb-3 font-bold text-navy-900">Past</h2>
              {past.length === 0 ? (
                <p className="text-sm text-navy-400">No past events for this filter.</p>
              ) : (
                <div className="space-y-2">
                  {past.slice(0, 20).map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </NavShell>
  );
}

function AllSportsCalendarView({ events, monthParam, sport, typeFilter }) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const byDay = {};
  for (const e of events) {
    const d = new Date(e.start_time);
    if (d >= monthStart && d <= monthEnd) {
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
    <Card className="mt-5">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={filterHref(sport, "calendar", prev, typeFilter)}>← Prev</Link>
          </Button>
          <h2 className="text-lg font-extrabold text-navy-900">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={filterHref(sport, "calendar", next, typeFilter)}>Next →</Link>
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
                className={`min-h-[72px] rounded-xl p-1 text-left ring-1 sm:min-h-[96px] ${
                  isToday ? "bg-brand-50 ring-brand-300" : "bg-navy-50/40 ring-navy-100"
                }`}
              >
                <div className={`px-1 text-[11px] font-semibold ${isToday ? "text-brand-700" : "text-navy-500"}`}>
                  {day}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => {
                    const s = getEventStyle(e.type);
                    const cfg = getSportConfig(e.sport || "volleyball");
                    return (
                      <Link
                        key={e.id}
                        href={sportPath(e.sport || "volleyball", `schedule/${e.id}`)}
                        className={`flex min-h-[28px] items-center gap-0.5 rounded-md px-1 py-1 active:opacity-80 ${s.chip}`}
                        title={`${cfg.label}: ${e.title}`}
                      >
                        <span className="shrink-0 text-[9px] leading-none">{cfg.icon}</span>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                        <span className="truncate text-[10px] font-medium leading-tight">{e.title}</span>
                      </Link>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <Link
                      href={filterHref(sport, "list", monthParam, typeFilter)}
                      className="block px-1 text-[9px] font-medium text-brand-600 hover:underline"
                    >
                      +{dayEvents.length - 3} more
                    </Link>
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

function Legend({ sport, view, month, typeFilter }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-navy-400">Filter:</span>
      {TYPE_FILTERS.map(({ key, label }) => {
        const active = typeFilter === key;
        return (
          <Link
            key={key}
            href={filterHref(sport, view, month, key)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 transition ${
              active
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-navy-600 ring-navy-100 hover:bg-navy-50"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${getEventStyle(key).dot}`} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function EventRow({ event }) {
  const style = getEventStyle(event.type);
  const cfg = getSportConfig(event.sport || "volleyball");
  return (
    <Link
      href={sportPath(event.sport || "volleyball", `schedule/${event.id}`)}
      className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-navy-50 active:opacity-80"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-navy-800">{event.title}</div>
        <div className="text-xs text-navy-400">{fmtDateTime(event.start_time)}</div>
      </div>
      <Badge className={SPORT_BADGE[event.sport] || SPORT_BADGE.volleyball}>
        {cfg.icon} {cfg.label}
      </Badge>
      <Badge className={style.chip}>{style.label}</Badge>
    </Link>
  );
}
