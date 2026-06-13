import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import NavShell from "@/components/NavShell";
import TeamCodeBadge from "@/components/TeamCodeBadge";
import { upcomingEvents, teamWellness, todaysCheckin } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { fmtDate, getEventStyle } from "@/lib/format";
import { isCoach, isParent, isPlayer } from "@/lib/permissions";
import { getSportConfig } from "@/lib/sports";
import { sportPath } from "@/lib/sportPaths";
import { resolveTeamId } from "@/lib/sportTeams";

function buildCards(sport) {
  const cfg = getSportConfig(sport);
  return [
    {
      href: sportPath(sport, "schedule"),
      title: "Schedule",
      subtitle: "Practices, conditioning, tournaments & bonding",
      icon: "📅",
      gradient: "from-sky-400 to-blue-600",
    },
    {
      href: sportPath(sport, "stats"),
      title: "Team Stats",
      subtitle: "Record, trends & analytics",
      icon: "📊",
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      href: sportPath(sport, "players"),
      title: "Player Stats",
      subtitle: "Profiles, leaderboard & trends",
      icon: cfg.playersCardIcon,
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      href: sportPath(sport, "checkin"),
      title: "Wellness Check",
      subtitle: "Energy, soreness, mood & recovery",
      icon: "🩺",
      gradient: "from-sky-500 to-cyan-600",
    },
    {
      href: sportPath(sport, "wellness-kit"),
      title: "Wellness Kit",
      subtitle: "Suggest items for your team kit",
      icon: "🎒",
      gradient: "from-teal-400 to-cyan-600",
    },
    {
      href: sportPath(sport, "exercises"),
      title: "Recommended Exercises",
      subtitle: "Drills, training & progress",
      icon: "💪",
      gradient: "from-blue-600 to-navy-800",
    },
    {
      href: sportPath(sport, "chat"),
      title: "Group Chat",
      subtitle: "Message coaches and teammates",
      icon: "💬",
      gradient: "from-indigo-500 to-blue-700",
    },
    {
      href: sportPath(sport, "gallery"),
      title: "Media Gallery",
      subtitle: "Photos, albums & highlights",
      icon: "📷",
      gradient: "from-cyan-500 to-blue-700",
    },
  ];
}

const PARENT_CARDS = (sport) => [
  {
    href: sportPath(sport, "schedule"),
    title: "Schedule",
    subtitle: "Practices, games & tournaments",
    icon: "📅",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    href: sportPath(sport, "gallery"),
    title: "Media Gallery",
    subtitle: "Photos, albums & highlights",
    icon: "📷",
    gradient: "from-cyan-500 to-blue-700",
  },
  {
    href: sportPath(sport, "players"),
    title: "Team Roster",
    subtitle: "Player profiles & basic info",
    icon: getSportConfig(sport).playersCardIcon,
    gradient: "from-cyan-500 to-blue-600",
  },
];

export default function SportHome({ user, sport }) {
  const cfg = getSportConfig(sport);
  const teamId = resolveTeamId(user, sport);
  const teamRow = teamId
    ? getDb().prepare("SELECT name, code FROM teams WHERE id = ?").get(teamId)
    : null;
  const nextEvent = teamId ? upcomingEvents(1, teamId)[0] : null;
  const wellness = isCoach(user) && teamId ? teamWellness(teamId) : null;
  const checkin = isPlayer(user) ? todaysCheckin(user.id) : null;
  const cards = isParent(user) ? PARENT_CARDS(sport) : buildCards(sport);

  const featured = isParent(user)
    ? nextEvent
      ? {
          href: sportPath(sport, `schedule/${nextEvent.id}`),
          icon: "📅",
          title: `Next up: ${nextEvent.title}`,
          sub: fmtDate(nextEvent.start_time),
          gradient: "from-sky-400 to-blue-600",
        }
      : {
          href: sportPath(sport, "gallery"),
          icon: "📷",
          title: "Team gallery",
          sub: "Browse photos from games and tournaments",
          gradient: "from-cyan-500 to-blue-700",
        }
    : isCoach(user)
      ? wellness?.needRest?.length
        ? {
            href: sportPath(sport, "checkin"),
            icon: "🩺",
            title: `${wellness.needRest.length} player${wellness.needRest.length > 1 ? "s" : ""} may need rest`,
            sub: "Review team wellness check-ins",
            gradient: "from-blue-500 to-blue-700",
          }
        : {
            href: sportPath(sport, "ai-coach"),
            icon: "🤖",
            title: "Run AI player insights",
            sub: "Spot soreness, energy and injury trends",
            gradient: "from-blue-600 to-navy-900",
          }
      : checkin
        ? {
            href: sportPath(sport, "exercises"),
            icon: "💪",
            title: "Today's training",
            sub: "Mark your recommended exercises complete",
            gradient: "from-blue-600 to-navy-900",
          }
        : {
            href: sportPath(sport, "checkin"),
            icon: "📝",
            title: "How are you feeling today?",
            sub: "Your 30-second daily wellness check-in",
            gradient: "from-blue-600 to-cyan-600",
          };

  return (
    <NavShell user={user} sport={sport}>
      <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${cfg.gradient} p-7 text-white ring-1 ring-white/20 shadow-soft sm:p-10`}>
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="relative animate-rise">
          <Link href="/" className="text-sm font-medium text-white/80 hover:text-white">
            ← All sports
          </Link>
          <span className="eyebrow mt-3 block text-white/70">{cfg.label} Hub</span>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.04] sm:text-5xl">
            {cfg.icon} {cfg.label}
          </h1>
          <p className="mt-3 max-w-md text-base text-white/90 sm:text-lg">{cfg.tagline}</p>

          {!teamId && (
            <p className="mt-4 rounded-xl bg-white/15 px-4 py-3 text-sm text-white/90 ring-1 ring-white/20">
              No {cfg.label.toLowerCase()} team linked yet. Join with a team code or ask your coach to add you.
            </p>
          )}

          {isCoach(user) && teamRow && (
            <div className="mt-4">
              <TeamCodeBadge code={teamRow.code} teamName={teamRow.name} isCoach />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {nextEvent && (
              <Link href={sportPath(sport, `schedule/${nextEvent.id}`)}>
                <Badge className="cursor-pointer bg-white/80 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                  <span className={`mr-1.5 h-2 w-2 rounded-full ${getEventStyle(nextEvent.type).dot}`} />
                  Next: {nextEvent.title} · {fmtDate(nextEvent.start_time)}
                </Badge>
              </Link>
            )}
            <Link href={sportPath(sport, "schedule")}>
              <Badge className="cursor-pointer bg-white/70 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                📅 Full schedule
              </Badge>
            </Link>
            <Link href="/schedule/all">
              <Badge className="cursor-pointer bg-white/70 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                🗓️ All sports
              </Badge>
            </Link>
          </div>
        </div>
      </section>

      <Link
        href={featured.href}
        className={`group relative mt-5 flex items-center gap-4 overflow-hidden rounded-[2rem] bg-gradient-to-br ${featured.gradient} p-5 text-white shadow-lift sm:p-6`}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/25 backdrop-blur-sm">
          {featured.icon}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">For you</div>
          <div className="truncate text-lg font-extrabold sm:text-xl">{featured.title}</div>
          <div className="truncate text-sm text-white/80">{featured.sub}</div>
        </div>
        <span className="relative text-2xl transition group-hover:translate-x-1">→</span>
      </Link>

      <h2 className="mb-3 mt-8 h-section">Explore</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            style={{ animationDelay: `${i * 45}ms` }}
            className={`group relative flex min-h-[150px] animate-rise flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-5 text-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-glow sm:min-h-[170px]`}
          >
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl ring-1 ring-white/25 backdrop-blur-sm transition group-hover:scale-105">
              {c.icon}
            </div>
            <div className="relative">
              <div className="text-lg font-extrabold leading-tight sm:text-xl">{c.title}</div>
              <div className="mt-0.5 text-xs text-white/80 sm:text-sm">{c.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-navy-400">
        {cfg.icon} RallyHQ {cfg.label} · built for the team
      </p>
    </NavShell>
  );
}
