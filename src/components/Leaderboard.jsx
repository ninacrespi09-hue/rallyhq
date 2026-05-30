"use client";

import { useState } from "react";
import Link from "next/link";
import { STATS } from "@/lib/statDefs";

export default function Leaderboard({ players }) {
  const [sortKey, setSortKey] = useState("kills");

  const sorted = [...players].sort((a, b) => b[sortKey] - a[sortKey]);

  return (
    <div className="card overflow-hidden">
      {/* Sort controls */}
      <div className="mb-3 flex flex-wrap gap-2">
        {STATS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSortKey(s.key)}
            className={`chip ring-1 transition ${
              sortKey === s.key
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-navy-600 ring-navy-100 hover:bg-navy-50"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
              <th className="py-2">#</th>
              <th>Player</th>
              {STATS.map((s) => (
                <th
                  key={s.key}
                  className={`px-2 text-center ${sortKey === s.key ? "text-brand-600" : ""}`}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.id} className="border-t border-navy-100">
                <td className="py-2 font-bold text-navy-300">{i + 1}</td>
                <td>
                  <Link href={`/players/${p.id}`} className="font-medium text-navy-800 hover:text-brand-600">
                    {p.name}
                  </Link>
                  <div className="text-xs text-navy-400">{p.position}</div>
                </td>
                {STATS.map((s) => (
                  <td
                    key={s.key}
                    className={`px-2 text-center ${
                      sortKey === s.key ? "font-bold text-brand-600" : "text-navy-600"
                    }`}
                  >
                    {p[s.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
