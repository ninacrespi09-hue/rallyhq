import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { upcomingEvents, teamWellness, todaysCheckin } from "@/lib/queries";
import { fmtDate, EVENT_STYLES } from "@/lib/format";

// The seven main navigation bubbles.
const CARDS = [
  {
    href: "/schedule",
    title: "Schedule",
    subtitle: "Practices, games, tournaments & bonding",
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

export default async function Landing() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nextEvent = upcomingEvents(1)[0];
  const wellness = user.role === "coach" ? teamWellness() : null;
  const checkin = user.role === "player" ? todaysCheckin(user.id) : null;

  return (
    <NavShell user={user}>
      {/* ---------- Hero with volleyball-net background ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-200 via-blue-100 to-white p-7 ring-1 ring-blue-200/60 shadow-soft sm:p-10">
        <NetBackground />

        {/* one soft accent, kept quiet */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-300/30 blur-3xl" />

        <div className="relative">
          <span className="chip bg-white/70 text-blue-700 ring-1 ring-blue-200 backdrop-blur">
            🏐 Team Hub
          </span>
          <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              RallyHQ
            </span>
          </h1>
          <p className="mt-3 max-w-md text-base text-navy-600 sm:text-lg">
            Hi {user.name.split(" ")[0]} 👋 Everything your team needs, in one place.
          </p>

          {/* live quick chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {nextEvent && (
              <Link
                href={`/schedule/${nextEvent.id}`}
                className="chip bg-white/80 text-navy-700 ring-1 ring-blue-200 backdrop-blur hover:bg-white"
              >
                <span className={`mr-1.5 h-2 w-2 rounded-full ${EVENT_STYLES[nextEvent.type].dot}`} />
                Next: {nextEvent.title} · {fmtDate(nextEvent.start_time)}
              </Link>
            )}
            {user.role === "coach" && wellness && wellness.needRest.length > 0 && (
              <Link
                href="/dashboard"
                className="chip bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
              >
                ⚠️ {wellness.needRest.length} player{wellness.needRest.length > 1 ? "s" : ""} may need rest
              </Link>
            )}
            {user.role === "player" && (
              <Link
                href="/checkin"
                className={`chip ring-1 backdrop-blur ${
                  checkin
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-white/80 text-blue-700 ring-blue-200 hover:bg-white"
                }`}
              >
                {checkin ? "✅ Checked in today" : "📝 Daily check-in pending"}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Navigation bubbles ---------- */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-3xl border-2 border-dotted border-[#1e3a8a] bg-gradient-to-br ${c.gradient} p-5 text-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-glow sm:min-h-[168px]`}
          >
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm ring-1 ring-white/20">
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

      <p className="mt-8 text-center text-xs text-navy-400">
        🏐 RallyHQ · built for the team
      </p>
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
