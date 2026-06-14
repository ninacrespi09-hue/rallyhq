"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TeamCodeCard from "./TeamCodeCard";
import { Button } from "@/components/ui/button";
import { navPrimaryForRole, navSecondaryForRole, navMobileForRole, isCoach } from "@/lib/permissions";
import { getSportConfig } from "@/lib/sports";
import { sportFromPathname } from "@/lib/sportPaths";

export default function NavShell({ user, children, sport: sportProp }) {
  const pathname = usePathname();
  const sport =
    sportProp ||
    sportFromPathname(pathname) ||
    user.active_sport ||
    null;
  const sportCfg = sport ? getSportConfig(sport) : null;

  const primary = navPrimaryForRole(user.role, sport, user);
  const secondary = navSecondaryForRole(user.role, sport, user);
  const mobileNav = navMobileForRole(user.role, sport, user);

  async function logout() {
    window.location.href = "/logout";
  }

  const isActive = (href) => {
    if (sport && href === `/${sport}`) return pathname === `/${sport}` || pathname === `/${sport}/`;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-gradient-to-b from-navy-900 to-navy-950 p-4 text-white">
        <Brand light sportIcon={sportCfg?.icon} />
        <nav className="mt-7 flex flex-1 flex-col gap-1">
          {[...primary, ...secondary].map((n) => (
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
        {isCoach(user) && <TeamCodeCard />}
        <UserCard user={user} onLogout={logout} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-navy-900 to-navy-800 px-4 py-3 text-white shadow-soft">
          <Brand light small sportIcon={sportCfg?.icon} />
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm font-medium text-blue-100">
              {user.name.split(" ")[0]}
            </Link>
            <Button variant="ghost" size="sm" onClick={logout} className="h-auto px-0 text-sm text-blue-200/70 hover:bg-transparent hover:text-white">
              Logout
            </Button>
          </div>
        </header>

        <main className="relative flex-1 w-auto md:w-full max-w-5xl mx-3 md:mx-auto my-3 md:my-6 rounded-[2rem] px-5 py-6 md:px-9 md:py-9 pb-[4.5rem] md:pb-9">
          {children}
        </main>

        {/* Mobile bottom nav — all home tabs, horizontally scrollable */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t border-navy-100 bg-white/95 backdrop-blur safe-area-pb">
          <div className="flex overflow-x-auto scrollbar-none">
            {mobileNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 px-2 py-2 text-[10px] font-medium ${
                  isActive(n.href) ? "text-brand-600" : "text-navy-300"
                }`}
              >
                <span className="text-lg leading-none">{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Brand({ small, light, sportIcon }) {
  return (
    <Link href="/" className="flex items-center gap-2" title="All sports">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-lg shadow-glow transition hover:scale-105">
        {sportIcon || "🏟️"}
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
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className="mt-3 h-auto w-full justify-start px-0 text-xs font-medium text-blue-200/60 hover:bg-transparent hover:text-white"
      >
        Sign out
      </Button>
    </div>
  );
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
