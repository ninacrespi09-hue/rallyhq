import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import Avatar from "@/components/Avatar";
import Leaderboard from "@/components/Leaderboard";
import PageHeader from "@/components/PageHeader";
import { teamLeaderboard } from "@/lib/stats";

export default async function PlayersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const players = teamLeaderboard();

  return (
    <NavShell user={user}>
      <PageHeader
        eyebrow="Roster"
        title="Players"
        subtitle="Tap a player to open their full profile, stats, and wellness history."
      />

      {/* Roster — clean cards (no stats) */}
      <h2 className="h-section mb-2">Roster</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className="group card flex flex-col items-center text-center transition hover:-translate-y-1 hover:ring-brand-200"
          >
            <div className="relative">
              <Avatar user={p} size={72} />
              {p.jersey_number != null && (
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white ring-2 ring-white">
                  {p.jersey_number}
                </span>
              )}
            </div>
            <div className="mt-3 font-bold text-navy-900">{p.name}</div>
            <span className="mt-1 chip bg-blue-50 text-blue-700">{p.position || "Player"}</span>
          </Link>
        ))}
      </div>

      {/* Sortable leaderboard */}
      <h2 className="h-section mb-2 mt-8">Team Leaderboard</h2>
      <Leaderboard players={players} />
    </NavShell>
  );
}
