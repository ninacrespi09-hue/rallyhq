import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import PageHeader from "@/components/PageHeader";
import { teamLeaderboard } from "@/lib/stats";
import { isParent } from "@/lib/permissions";

// Translucent blue shades so the overlapping circles blend where they meet.
const CIRCLE_SHADES = [
  "bg-blue-500/70",
  "bg-cyan-600/60",
  "bg-blue-600/65",
  "bg-sky-600/60",
  "bg-indigo-500/60",
  "bg-blue-700/55",
  "bg-cyan-500/65",
  "bg-navy-600/55",
];

export default async function PlayersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const players = teamLeaderboard(user.team_id);

  // Group into rows of four (4 on top, 4 on the bottom for an 8-player roster).
  const rows = [];
  for (let i = 0; i < players.length; i += 4) rows.push(players.slice(i, i + 4));

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Roster"
        title={isParent(user) ? "Team" : "Players"}
        subtitle={
          isParent(user)
            ? "Tap a player for basic profile and season stats."
            : "Tap a player to open their full profile, stats, and wellness history."
        }
      />

      {/* Roster — overlapping translucent blue circles, four per row */}
      <h2 className="h-section mb-4">Roster</h2>
      <div>
        {rows.map((row, r) => (
          <div key={r} className={`flex ${r > 0 ? "-mt-5 sm:-mt-10 lg:-mt-12" : ""}`}>
            {row.map((p, idx) => {
              const i = r * 4 + idx;
              return (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  title={`${p.name}${p.position ? ` · ${p.position}` : ""}`}
                  className="group relative z-0 -ml-10 first:ml-0 sm:-ml-14 lg:-ml-20 transition duration-200 hover:z-20 hover:-translate-y-1 hover:scale-105"
                >
                  <div
                    className={`grid h-32 w-32 place-items-center rounded-full sm:h-48 sm:w-48 lg:h-60 lg:w-60 ${CIRCLE_SHADES[i % CIRCLE_SHADES.length]} text-white backdrop-blur-sm`}
                  >
                    <div className="px-3 text-center leading-tight drop-shadow-sm">
                      <div className="text-lg font-extrabold sm:text-2xl lg:text-3xl">{p.name.split(" ")[0]}</div>
                      {p.jersey_number != null && (
                        <div className="mt-0.5 text-xs font-semibold text-white/90 sm:text-base">
                          #{p.jersey_number}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </NavShell>
  );
}
