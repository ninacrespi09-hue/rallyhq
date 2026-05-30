"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Primary destinations — shown in the mobile bottom bar and the sidebar.
const PRIMARY = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
  { href: "/players", label: "Players", icon: "🏐" },
  { href: "/exercises", label: "Exercises", icon: "💪" },
  { href: "/gallery", label: "Gallery", icon: "📷" },
];

// Secondary destinations — sidebar only (desktop).
const SECONDARY = [
  { href: "/stats", label: "Team Stats", icon: "📊" },
  { href: "/checkin", label: "Wellness", icon: "🩺" },
  { href: "/insights", label: "AI Insights", icon: "🤖" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/dashboard", label: "Dashboard", icon: "📋" },
];

export default function NavShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = PRIMARY;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-navy-900 to-navy-950 p-4 text-white">
        <Brand light />
        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {[...PRIMARY, ...SECONDARY].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive(n.href)
                  ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                  : "text-blue-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <UserCard user={user} onLogout={logout} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 px-4 py-3 text-white shadow-soft">
          <Brand light small />
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm font-medium text-blue-100">
              {user.name.split(" ")[0]}
            </Link>
            <button onClick={logout} className="text-sm text-blue-200/70">
              Logout
            </button>
          </div>
        </header>

        <main className="relative flex-1 w-auto md:w-full max-w-5xl mx-3 md:mx-auto my-3 md:my-6 rounded-[2rem] px-5 py-6 md:px-9 md:py-9 pb-24 md:pb-9">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 grid grid-cols-5 border-t border-navy-100 bg-white/95 backdrop-blur">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                isActive(n.href) ? "text-brand-600" : "text-navy-300"
              }`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Brand({ small, light }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg shadow-glow">
        🏐
      </span>
      <span
        className={`font-extrabold tracking-tight ${light ? "text-white" : "text-navy-900"} ${
          small ? "text-lg" : "text-xl"
        }`}
      >
        Rally<span className="text-brand-300">HQ</span>
      </span>
    </Link>
  );
}

function UserCard({ user, onLogout }) {
  return (
    <div className="mt-4 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
      <Link href="/profile" className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
          {initials(user.name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">{user.name}</div>
          <div className="text-xs capitalize text-blue-200/70">{user.role}</div>
        </div>
      </Link>
      <button
        onClick={onLogout}
        className="mt-3 w-full text-left text-xs font-medium text-blue-200/60 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
