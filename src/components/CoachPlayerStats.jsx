"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STATS } from "@/lib/statDefs";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import StatEditor from "./StatEditor";

export default function CoachPlayerStats({ player, games, stats = STATS }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);

  const columns = useMemo(
    () => [
      {
        id: "game",
        header: "Game",
        cell: ({ row }) => {
          const g = row.original;
          return (
            <div>
              <div className="font-medium text-navy-800">{g.opponent || g.title}</div>
              <div className="text-xs text-muted-foreground">{g.start_time?.slice(0, 10)}</div>
            </div>
          );
        },
      },
      ...stats.map((s) => ({
        id: s.key,
        header: s.label,
        cell: ({ row }) => (
          <span className="block text-center text-navy-600">{row.original[s.key]}</span>
        ),
      })),
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-semibold text-brand-600"
              onClick={() => setEditing(row.original.event_id)}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ],
    [stats]
  );

  if (!games.length) {
    return <p className="text-sm text-navy-400">No games recorded yet. Add stats from a game on the schedule.</p>;
  }

  const game = editing ? games.find((g) => g.event_id === editing) : null;

  return (
    <>
      <div className="overflow-x-auto">
        <DataTable columns={columns} data={games} className="min-w-[520px] border-0 bg-transparent" />
      </div>

      {game && (
        <StatEditor
          eventId={game.event_id}
          playerId={player.id}
          playerName={player.name}
          existing={game}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
