import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import NavShell from "@/components/NavShell";
import TeamCodeBadge from "@/components/TeamCodeBadge";
import { FeatureIcon, SportGlyph } from "@/components/icons";
import { upcomingEvents, teamWellness, todaysCheckin } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { fmtDate, getEventStyle } from "@/lib/format";
import { isCoach, isParent, isPlayer } from "@/lib/permissions";
import { getSportConfig } from "@/lib/sports";
import { sportPath } from "@/lib/sportPaths";
import { resolveTeamId } from "@/lib/sportTeams";

function buildCards(sport) {
  return [
    {
      href: sportPath(sport, "schedule"),
      title: "Schedule",
      subtitle: "Practices, conditioning, tournaments & bonding",
      icon: "schedule",
      gradient: "from-sky-300 to-blue-500",
    },
    {
      href: sportPath(sport, "stats"),
      title: "Team Stats",
      subtitle: "Record, trends & analytics",
      icon: "stats",
      gradient: "from-blue-400 to-blue-600",
    },
    {
      href: sportPath(sport, "players"),
      title: "Player Stats",
      subtitle: "Profiles, leaderboard & trends",
      icon: "players",
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      href: sportPath(sport, "checkin"),
      title: "Wellness Check",
      subtitle: "Energy, soreness, mood & recovery",
      icon: "wellness",
      gradient: "from-sky-400 to-cyan-500",
    },
    {
      href: sportPath(sport, "wellness-kit"),
      title: "Wellness Kit",
      subtitle: "Suggest items for your team kit",
      icon: "kit",
      gradient: "from-blue-300 to-cyan-500",
    },
    {
      href: sportPath(sport, "exercises"),
      title: "Recommended Exercises",
      subtitle: "Drills, training & progress",
      icon: "exercises",
      gradient: "from-blue-500 to-blue-700",
    },
    {
      href: sportPath(sport, "chat"),
      title: "Group Chat",
      subtitle: "Message coaches and teammates",
      icon: "chat",
      gradient: "from-blue-400 to-blue-600",
    },
    {
      href: sportPath(sport, "gallery"),
      title: "Media Gallery",
      subtitle: "Photos, albums & highlights",
      icon: "gallery",
      gradient: "from-cyan-400 to-blue-600",
    },
  ];
}

const PARENT_CARDS = (sport) => [
  {
    href: sportPath(sport, "schedule"),
    title: "Schedule",
    subtitle: "Practices, games & tournaments",
    icon: "schedule",
    gradient: "from-sky-300 to-blue-500",
  },
  {
    href: sportPath(sport, "stats"),
    title: "Team Stats",
    subtitle: "Game results & player stats",
    icon: "stats",
    gradient: "from-blue-400 to-blue-600",
  },
  {
    href: sportPath(sport, "exercises"),
    title: "Conditioning",
    subtitle: "Assigned drills & training",
    icon: "exercises",
    gradient: "from-blue-500 to-blue-700",
  },
  {
    href: sportPath(sport, "announcements"),
    title: "Announcements",
    subtitle: "Team news & updates",
    icon: "announcements",
    gradient: "from-blue-400 to-blue-600",
  },
  {
    href: sportPath(sport, "gallery"),
    title: "Media Gallery",
    subtitle: "Photos, albums & highlights",
    icon: "gallery",
    gradient: "from-cyan-400 to-blue-600",
  },
  {
    href: sportPath(sport, "players"),
    title: "Team Roster",
    subtitle: "Player profiles & basic info",
    icon: "players",
    gradient: "from-cyan-400 to-blue-500",
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
          icon: "schedule",
          title: `Next up: ${nextEvent.title}`,
          sub: fmtDate(nextEvent.start_time),
          gradient: "from-sky-300 to-blue-500",
        }
      : {
          href: sportPath(sport, "gallery"),
          icon: "gallery",
          title: "Team gallery",
          sub: "Browse photos from games and tournaments",
          gradient: "from-cyan-400 to-blue-600",
        }
    : isCoach(user)
      ? wellness?.needRest?.length
        ? {
            href: sportPath(sport, "checkin"),
            icon: "wellness",
            title: `${wellness.needRest.length} player${wellness.needRest.length > 1 ? "s" : ""} may need rest`,
            sub: "Review team wellness check-ins",
            gradient: "from-blue-400 to-blue-600",
          }
        : {
            href: sportPath(sport, "ai-coach"),
            icon: "ai",
            title: "Run AI player insights",
            sub: "Spot soreness, energy and injury trends",
            gradient: "from-blue-500 to-blue-700",
          }
      : checkin
        ? {
            href: sportPath(sport, "exercises"),
            icon: "exercises",
            title: "Today's training",
            sub: "Mark your recommended exercises complete",
            gradient: "from-blue-500 to-blue-700",
          }
        : {
            href: sportPath(sport, "checkin"),
            icon: "checkin",
            title: "How are you feeling today?",
            sub: "Your 30-second daily wellness check-in",
            gradient: "from-blue-500 to-cyan-500",
          };

  return (
    <NavShell user={user} sport={sport}>
      <section className={`rounded-md bg-gradient-to-br ${
        sport === "basketball"
          ? "from-blue-300 to-blue-600"
          : sport === "soccer"
            ? "from-sky-400 to-cyan-500"
            : "from-sky-300 to-blue-500"
      } p-6 text-white ring-1 ring-white/20 shadow-soft sm:p-8`}>
        <div>
          <Link href="/" className="text-sm font-medium text-white/80 hover:text-white">
            ← All sports
          </Link>
          <span className="eyebrow mt-3 block text-white/70">{cfg.label} Hub</span>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold leading-tight sm:text-4xl">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-white/20 ring-1 ring-white/25">
              <SportGlyph sport={sport} className="h-5 w-5" />
            </span>
            {cfg.label}
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/90 sm:text-base">{cfg.tagline}</p>

          {!teamId && (
            <p className="mt-4 rounded-md bg-white/15 px-4 py-3 text-sm text-white/90 ring-1 ring-white/20">
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
                <Badge className="cursor-pointer border-0 bg-white/80 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${getEventStyle(nextEvent.type).dot}`} />
                  Next: {nextEvent.title} · {fmtDate(nextEvent.start_time)}
                </Badge>
              </Link>
            )}
            <Link href={sportPath(sport, "schedule")}>
              <Badge className="cursor-pointer border-0 bg-white/70 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                Full schedule
              </Badge>
            </Link>
            <Link href="/schedule/all">
              <Badge className="cursor-pointer border-0 bg-white/70 text-navy-700 ring-1 ring-white/40 backdrop-blur transition hover:bg-white">
                All sports
              </Badge>
            </Link>
          </div>
        </div>
      </section>

      <Link
        href={featured.href}
        className={`group mt-4 flex items-center gap-4 rounded-md bg-gradient-to-br ${featured.gradient} p-4 text-white shadow-soft sm:p-5`}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white/20 text-white ring-1 ring-white/25 backdrop-blur-sm">
          <FeatureIcon name={featured.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">For you</div>
          <div className="truncate text-base font-semibold sm:text-lg">{featured.title}</div>
          <div className="truncate text-sm text-white/85">{featured.sub}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-white/80 transition group-hover:translate-x-0.5" />
      </Link>

      <h2 className="mb-3 mt-8 h-section">Explore</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group flex min-h-[132px] flex-col justify-between overflow-hidden rounded-md bg-gradient-to-br ${c.gradient} p-4 text-white shadow-soft transition hover:shadow-glow sm:min-h-[148px] sm:p-5`}
          >
            <div className="grid h-9 w-9 place-items-center rounded-md bg-white/20 ring-1 ring-white/25 backdrop-blur-sm">
              <FeatureIcon name={c.icon} className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight sm:text-base">{c.title}</div>
              <div className="mt-1 text-xs text-white/85 sm:text-sm">{c.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-navy-400">RallyHQ {cfg.label}</p>
    </NavShell>
  );
}
