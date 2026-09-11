"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import TeamCodeCard from "./TeamCodeCard";
import { Button } from "@/components/ui/button";
import { NavIcon, SportGlyph } from "@/components/icons";
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
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-blue-200/80 bg-gradient-to-b from-blue-100 to-sky-100 p-4 text-navy-800">
        <Brand sport={sport} />
        <nav className="mt-6 flex flex-1 flex-col gap-0.5">
          {[...primary, ...secondary].map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(n.href)
                  ? "bg-blue-200 text-blue-900 shadow-sm ring-1 ring-blue-300/70"
                  : "text-blue-800/75 hover:bg-blue-200/50 hover:text-blue-900"
              }`}
            >
              <NavIcon href={n.href} className="h-4 w-4 shrink-0 opacity-90" />
              {n.label}
            </Link>
          ))}
        </nav>
        {isCoach(user) && <TeamCodeCard />}
        <UserCard user={user} onLogout={logout} />
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white shadow-soft">
          <Brand light small sport={sport} />
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm font-medium text-blue-100">
              {user.name.split(" ")[0]}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-auto px-0 text-sm text-blue-100/80 hover:bg-transparent hover:text-white"
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="relative flex-1 w-auto md:w-full max-w-5xl mx-3 md:mx-auto my-3 md:my-6 rounded-md border border-blue-300/50 bg-card/80 px-5 py-6 md:px-8 md:py-8 pb-[4.5rem] md:pb-8 shadow-soft backdrop-blur-sm">
          {children}
        </main>

        <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t border-blue-100 bg-white/95 backdrop-blur safe-area-pb">
          <div className="flex overflow-x-auto scrollbar-none">
            {mobileNav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex min-w-[4.25rem] shrink-0 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium ${
                  isActive(n.href) ? "text-brand-500" : "text-navy-400"
                }`}
              >
                <NavIcon href={n.href} className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function Brand({ small, light, sport }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" title="All sports">
      <span
        className={`grid h-8 w-8 place-items-center rounded-md text-white shadow-glow ${
          light
            ? "bg-gradient-to-br from-brand-300 to-brand-500"
            : "bg-gradient-to-br from-brand-400 to-brand-500"
        }`}
      >
        {sport ? <SportGlyph sport={sport} className="h-4 w-4" /> : <NavIcon href="/" className="h-4 w-4" />}
      </span>
      <span
        className={`font-semibold tracking-tight ${light ? "text-white" : "text-navy-900"} ${
          small ? "text-base" : "text-lg"
        }`}
      >
        Rally<span className={light ? "text-brand-100" : "text-brand-500"}>HQ</span>
      </span>
    </Link>
  );
}

function UserCard({ user, onLogout }) {
  return (
    <div className="mt-4 rounded-md border border-blue-200/80 bg-blue-50/80 p-3">
      <Link href="/profile" className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-brand-400 to-brand-500 text-xs font-semibold text-white">
          {initials(user.name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-navy-900">{user.name}</div>
          <div className="text-xs capitalize text-blue-700/70">{user.role}</div>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className="mt-3 h-auto w-full justify-start px-0 text-xs font-medium text-blue-700/70 hover:bg-transparent hover:text-blue-900"
      >
        Sign out
      </Button>
    </div>
  );
}

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
