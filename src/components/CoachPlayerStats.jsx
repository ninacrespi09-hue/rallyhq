"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATS } from "@/lib/statDefs";
import StatEditor from "./StatEditor";

export default function CoachPlayerStats({ player, games }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null);

  if (!games.length) {
    return <p className="text-sm text-navy-400">No games recorded yet. Add stats from a game on the schedule.</p>;
  }

  const game = editing ? games.find((g) => g.event_id === editing) : null;

  return (
    <>
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
            <th className="py-2">Game</th>
            {STATS.map((s) => (
              <th key={s.key} className="px-2 text-center">
                {s.label}
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.event_id} className="border-t border-navy-100">
              <td className="py-2">
                <div className="font-medium text-navy-800">{g.opponent || g.title}</div>
                <div className="text-xs text-navy-400">{g.start_time?.slice(0, 10)}</div>
              </td>
              {STATS.map((s) => (
                <td key={s.key} className="px-2 text-center text-navy-600">
                  {g[s.key]}
                </td>
              ))}
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => setEditing(g.event_id)}
                  className="text-xs font-semibold text-brand-600"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
