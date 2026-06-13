import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessAllSports, homePathForUser } from "@/lib/userSportPreference";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
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

const SPORT_BADGE = {
  volleyball: "bg-sky-100 text-sky-800",
  basketball: "bg-orange-100 text-orange-800",
  soccer: "bg-emerald-100 text-emerald-800",
};

export default async function AllSportsSchedulePage({ searchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAllSports(user)) redirect(homePathForUser(user));

  const sp = (await searchParams) || {};
  const filter = SPORT_IDS.includes(sp.sport) || sp.sport === "all" ? sp.sport : "all";
  const events = allSportEvents(user.id, filter);
  const upcoming = events.filter((e) => new Date(e.start_time) >= new Date(new Date().toDateString()));
  const past = events.filter((e) => new Date(e.start_time) < new Date(new Date().toDateString()));

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Calendar"
        title="All Sports Schedule"
        subtitle="Every practice, game, and event across volleyball, basketball, and soccer."
      />

      <Link href="/" className="mb-4 inline-block text-sm font-medium text-brand-600">
        ← Choose a sport
      </Link>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/schedule/all?sport=${f.key}`}>
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
    </NavShell>
  );
}

function EventRow({ event }) {
  const style = getEventStyle(event.type);
  const cfg = getSportConfig(event.sport || "volleyball");
  return (
    <Link
      href={sportPath(event.sport || "volleyball", `schedule/${event.id}`)}
      className="flex items-center gap-3 rounded-xl p-3 hover:bg-navy-50"
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
