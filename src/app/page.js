import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import TeamCodeBadge from "@/components/TeamCodeBadge";
import { upcomingEvents, teamWellness, todaysCheckin } from "@/lib/queries";
import { fmtDate, EVENT_STYLES } from "@/lib/format";
import { isCoach, isParent, isPlayer } from "@/lib/permissions";

// The seven main navigation bubbles.
const CARDS = [
  {
    href: "/schedule",
    title: "Schedule",
    subtitle: "Practices, conditioning, tournaments & bonding",
    icon: "📅",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    href: "/stats",
    title: "Team Stats",
    subtitle: "Record, trends & analytics",
    icon: "📊",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    href: "/players",
    title: "Player Stats",
    subtitle: "Profiles, leaderboard & trends",
    icon: "🏐",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    href: "/checkin",
    title: "Wellness Check",
    subtitle: "Energy, soreness, mood & recovery",
    icon: "🩺",
    gradient: "from-sky-500 to-cyan-600",
  },
  {
    href: "/exercises",
    title: "Recommended Exercises",
    subtitle: "Drills, training & progress",
    icon: "💪",
    gradient: "from-blue-600 to-navy-800",
  },
  {
    href: "/announcements",
    title: "Coach Announcements",
    subtitle: "Updates, reminders & info",
    icon: "📣",
    gradient: "from-indigo-500 to-blue-700",
  },
  {
    href: "/gallery",
    title: "Media Gallery",
    subtitle: "Photos, albums & highlights",
    icon: "📷",
    gradient: "from-cyan-500 to-blue-700",
  },
];

const PARENT_CARDS = [
  {
    href: "/schedule",
    title: "Schedule",
    subtitle: "Practices, games & tournaments",
    icon: "📅",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    href: "/announcements",
    title: "Announcements",
    subtitle: "Updates, reminders & info",
    icon: "📣",
    gradient: "from-indigo-500 to-blue-700",
  },
  {
    href: "/gallery",
    title: "Media Gallery",
    subtitle: "Photos, albums & highlights",
    icon: "📷",
    gradient: "from-cyan-500 to-blue-700",
  },
  {
    href: "/players",
    title: "Team Roster",
    subtitle: "Player profiles & basic info",
    icon: "🏐",
    gradient: "from-cyan-500 to-blue-600",
  },
];

export default async function Landing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nextEvent = upcomingEvents(1, user.team_id)[0];
  const wellness = isCoach(user) ? teamWellness(user.team_id) : null;
  const checkin = isPlayer(user) ? todaysCheckin(user.id) : null;
  const cards = isParent(user) ? PARENT_CARDS : CARDS;

  // Role-aware "for you" featured action.
  const featured = isParent(user)
    ? nextEvent
      ? {
          href: `/schedule/${nextEvent.id}`,
          icon: "📅",
          title: `Next up: ${nextEvent.title}`,
          sub: fmtDate(nextEvent.start_time),
          gradient: "from-sky-400 to-blue-600",
        }
      : {
          href: "/announcements",
          icon: "📣",
          title: "Team announcements",
          sub: "Catch up on the latest from your coach",
          gradient: "from-indigo-500 to-blue-700",
        }
    : isCoach(user)
      ? wellness?.needRest?.length
        ? {
            href: "/dashboard",
            icon: "🩺",
            title: `${wellness.needRest.length} player${wellness.needRest.length > 1 ? "s" : ""} may need rest`,
            sub: "Open the team wellness summary",
            gradient: "from-blue-500 to-blue-700",
          }
        : {
            href: "/insights",
            icon: "🤖",
            title: "Run AI player insights",
            sub: "Spot soreness, energy and injury trends",
            gradient: "from-blue-600 to-navy-900",
          }
      : checkin
        ? {
            href: "/exercises",
            icon: "💪",
            title: "Today's training",
            sub: "Mark your recommended exercises complete",
            gradient: "from-blue-600 to-navy-900",
          }
        : {
            href: "/checkin",
            icon: "📝",
            title: "How are you feeling today?",
            sub: "Your 30-second daily wellness check-in",
            gradient: "from-blue-600 to-cyan-600",
          };

  return (
    <NavShell user={user}>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-200 via-blue-100 to-white p-7 ring-1 ring-blue-200/60 shadow-soft sm:p-10">
        <NetBackground />
        {isCoach(user) && user.team_code && (
          <TeamCodeBadge code={user.team_code} teamName={user.team_name} isCoach />
        )}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-blue-300/30 blur-3xl animate-float" />

        <div className="relative animate-rise">
          <span className="eyebrow">Team Hub</span>
          <h1 className="mt-2 text-4xl font-extrabold leading-[1.04] text-navy-900 sm:text-5xl lg:text-[3.75rem]">
            Welcome to <span className="title-gradient">RallyHQ</span>
          </h1>
          <p className="mt-3 max-w-md text-base text-navy-600 sm:text-lg">
            Hi {user.name.split(" ")[0]} 👋 Everything your team needs, in one place.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {nextEvent && (
              <Link
                href={`/schedule/${nextEvent.id}`}
                className="chip bg-white/80 text-navy-700 ring-1 ring-blue-200 backdrop-blur transition hover:bg-white"
              >
                <span className={`mr-1.5 h-2 w-2 rounded-full ${EVENT_STYLES[nextEvent.type].dot}`} />
                Next: {nextEvent.title} · {fmtDate(nextEvent.start_time)}
              </Link>
            )}
            <Link
              href="/schedule"
              className="chip bg-white/70 text-blue-700 ring-1 ring-blue-200 backdrop-blur transition hover:bg-white"
            >
              📅 Full schedule
            </Link>
            <Link
              href="/schedule?view=upcoming"
              className="chip bg-white/70 text-blue-700 ring-1 ring-blue-200 backdrop-blur transition hover:bg-white"
            >
              ⏭️ Upcoming
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Featured "for you" action ---------- */}
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

      {/* ---------- Navigation bubbles ---------- */}
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
            <span className="absolute right-4 top-5 text-xl opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">
              →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-navy-400">🏐 RallyHQ · built for the team</p>
    </NavShell>
  );
}

/** Subtle volleyball-net mesh with a white top tape band. */
function NetBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="vnet" width="34" height="34" patternUnits="userSpaceOnUse">
          <path d="M34 0H0V34" fill="none" stroke="#2563eb" strokeWidth="1" />
        </pattern>
        <linearGradient id="netfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="netmask">
          <rect width="100%" height="100%" fill="url(#netfade)" />
        </mask>
      </defs>
      {/* net mesh, faded toward the bottom */}
      <rect width="100%" height="100%" fill="url(#vnet)" opacity="0.18" mask="url(#netmask)" />
      {/* top tape band of the net */}
      <rect x="0" y="0" width="100%" height="8" fill="white" opacity="0.85" />
      <rect x="0" y="8" width="100%" height="2" fill="#1d4ed8" opacity="0.4" />
    </svg>
  );
}
