"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATS } from "@/lib/statDefs";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
export default function Leaderboard({ players }) {
  const [sortKey, setSortKey] = useState("kills");

  const sorted = useMemo(
    () => [...players].sort((a, b) => b[sortKey] - a[sortKey]),
    [players, sortKey]
  );

  const columns = useMemo(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => <span className="font-bold text-navy-300">{row.index + 1}</span>,
      },
      {
        id: "player",
        header: "Player",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <Link href={`/players/${p.id}`} className="font-medium text-navy-800 hover:text-brand-600">
                {p.name}
              </Link>
              <div className="text-xs text-muted-foreground">{p.position}</div>
            </div>
          );
        },
      },
      ...STATS.map((s) => ({
        id: s.key,
        header: () => (
          <span className={sortKey === s.key ? "text-brand-600" : ""}>{s.label}</span>
        ),
        cell: ({ row }) => (
          <span
            className={`block text-center ${
              sortKey === s.key ? "font-bold text-brand-600" : "text-navy-600"
            }`}
          >
            {row.original[s.key]}
          </span>
        ),
      })),
    ],
    [sortKey]
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {STATS.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={sortKey === s.key ? "default" : "outline"}
              onClick={() => setSortKey(s.key)}
              className="rounded-full"
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={sorted} className="min-w-[520px] border-0 bg-transparent" />
        </div>
      </CardContent>
    </Card>
  );
}
