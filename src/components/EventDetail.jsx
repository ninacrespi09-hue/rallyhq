"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isCompetitive } from "@/lib/format";
import { STATS } from "@/lib/statDefs";
import { formatStatValue, gameStatValue } from "@/lib/statAgg";
import { cn } from "@/lib/utils";
import StatEditor from "./StatEditor";
import { isCoach, isParent, isPlayer, canManageRsvp, canRsvp } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApiMutation } from "@/hooks/use-api";

const STATUSES = ["present", "late", "absent", "excused"];
const STATUS_STYLE = {
  present: "bg-emerald-600 text-white ring-emerald-600",
  late: "bg-blue-500 text-white ring-blue-500",
  absent: "bg-blue-500 text-white ring-blue-500",
  excused: "bg-navy-400 text-white ring-navy-400",
};

const RSVP_OPTIONS = [
  { key: "going", label: "Going" },
  { key: "maybe", label: "Maybe" },
  { key: "cant_go", label: "Can't Go" },
];
const RSVP_STYLE = {
  going: "bg-emerald-600 text-white ring-emerald-600",
  maybe: "bg-blue-500 text-white ring-blue-500",
  cant_go: "bg-navy-400 text-white ring-navy-400",
};

export default function EventDetail({ event, user, players, initialAttendance, initialRsvps = [], initialResult, initialStats, stats = STATS }) {
  const coach = isCoach(user);
  const parent = isParent(user);
  const player = isPlayer(user);
  const isGame = isCompetitive(event.type);

  const rsvpMutation = useApiMutation({ url: `/api/events/${event.id}/rsvp` });
  const rsvpClearMutation = useApiMutation({ url: `/api/events/${event.id}/rsvp`, method: "DELETE" });
  const attendanceMutation = useApiMutation({ url: `/api/events/${event.id}/attendance` });

  const [att, setAtt] = useState(() => {
    const map = {};
    initialAttendance.forEach((a) => (map[a.user_id] = a.status));
    return map;
  });

  const [rsvp, setRsvp] = useState(() => {
    const map = {};
    initialRsvps.forEach((r) => (map[r.user_id] = r.status));
    return map;
  });

  const rsvpCounts = useMemo(() => {
    const counts = { going: 0, maybe: 0, cant_go: 0 };
    for (const p of players) {
      const s = rsvp[p.id];
      if (s && counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [players, rsvp]);
  const rsvpResponded = rsvpCounts.going + rsvpCounts.maybe + rsvpCounts.cant_go;

  function setRsvpStatus(userId, status) {
    setRsvp((m) => ({ ...m, [userId]: status }));
    rsvpMutation.mutate({ user_id: userId, status });
  }

  function clearRsvp(userId) {
    setRsvp((m) => {
      const next = { ...m };
      delete next[userId];
      return next;
    });
    rsvpClearMutation.mutate({ user_id: userId });
  }

  function setStatus(userId, status) {
    setAtt((m) => ({ ...m, [userId]: status }));
    attendanceMutation.mutate({ user_id: userId, status });
  }

  const present = Object.values(att).filter((s) => s === "present" || s === "late").length;

  return (
    <div className="space-y-5">
      {/* RSVP / availability (pre-event) */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">RSVP</h2>
            <span className="text-sm text-navy-400">
              {rsvpResponded}/{players.length} responded
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {RSVP_OPTIONS.map(({ key, label }) => (
              <Badge key={key} className={cn("ring-1", RSVP_STYLE[key])}>
                {label}: {rsvpCounts[key]}
              </Badge>
            ))}
          </div>

          {(coach || parent || isGame) && (
            <div className="mt-3 space-y-2 text-sm text-navy-600">
              {RSVP_OPTIONS.map(({ key, label }) => {
                const names = players.filter((p) => rsvp[p.id] === key).map((p) => p.name);
                return (
                  <div key={key}>
                    <span className="font-semibold text-navy-800">{label}:</span>{" "}
                    {names.length ? names.join(", ") : <span className="text-navy-400">—</span>}
                  </div>
                );
              })}
            </div>
          )}

          {parent && canRsvp(user) && (
            <div className="mt-4 rounded-xl bg-navy-50 p-3">
              <p className="text-sm font-semibold text-navy-800">Your RSVP</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {RSVP_OPTIONS.map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRsvpStatus(user.id, key)}
                    className={cn(
                      "h-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition hover:bg-white",
                      rsvp[user.id] === key ? RSVP_STYLE[key] : "bg-white text-navy-500 ring-navy-100"
                    )}
                  >
                    {label}
                  </Button>
                ))}
                {rsvp[user.id] && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => clearRsvp(user.id)}
                    className="h-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-navy-400 ring-1 ring-navy-100 hover:bg-white"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-navy-400">Let the coach know if your athlete can attend.</p>
            </div>
          )}

          {!parent && (
            <div className="mt-3 space-y-2">
              {players.map((p) => {
                const mine = p.id === user.id;
                const editable = canManageRsvp(user) || (canRsvp(user) && mine);
                if (!editable && !coach) return null;
                const status = rsvp[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-28 shrink-0 truncate text-sm font-medium text-navy-700">
                      {p.name} {mine && <span className="text-xs text-brand-600">(you)</span>}
                    </div>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {RSVP_OPTIONS.map(({ key, label }) => (
                        <Button
                          key={key}
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!editable}
                          onClick={() => setRsvpStatus(p.id, key)}
                          className={cn(
                            "h-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition disabled:opacity-40 hover:bg-white",
                            status === key ? RSVP_STYLE[key] : "bg-white text-navy-500 ring-navy-100"
                          )}
                        >
                          {label}
                        </Button>
                      ))}
                      {editable && status && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => clearRsvp(p.id)}
                          className="h-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-navy-400 ring-1 ring-navy-100 hover:bg-white"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {player && !coach && (
            <p className="mt-3 text-xs text-navy-400">Tap Going, Maybe, or Can&apos;t Go to RSVP for this event.</p>
          )}
        </CardContent>
      </Card>

      {/* Attendance — hidden for games/tournaments (RSVP-only view) */}
      {!isGame && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-900">Attendance</h2>
              <span className="text-sm text-navy-400">
                {present}/{players.length} in
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {players.map((p) => {
                const mine = p.id === user.id;
                const editable = coach || (mine && !parent);
                const status = att[p.id];
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-28 shrink-0 truncate text-sm font-medium text-navy-700">
                      {p.name} {mine && <span className="text-xs text-brand-600">(you)</span>}
                    </div>
                    <div className="flex flex-1 flex-wrap gap-1.5">
                      {STATUSES.map((st) => (
                        <Button
                          key={st}
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!editable}
                          onClick={() => setStatus(p.id, st)}
                          className={cn(
                            "h-auto rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 transition disabled:opacity-40 hover:bg-white",
                            status === st ? STATUS_STYLE[st] : "bg-white text-navy-500 ring-navy-100"
                          )}
                        >
                          {st}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {!coach && !parent && (
              <p className="mt-3 text-xs text-navy-400">You can set your own attendance status.</p>
            )}
          </CardContent>
        </Card>
      )}

      {isGame && (
        <>
          <ResultPanel event={event} isCoach={coach} initial={initialResult} />
          <StatsPanel
            event={event}
            players={players}
            initialStats={initialStats}
            isCoach={coach}
            isParent={parent}
            userId={user.id}
            stats={stats}
          />
        </>
      )}
    </div>
  );
}

function ResultPanel({ event, isCoach, initial }) {
  const router = useRouter();
  const [our, setOur] = useState(initial?.our_score ?? 0);
  const [opp, setOpp] = useState(initial?.opp_score ?? 0);

  const resultMutation = useApiMutation({ url: `/api/events/${event.id}/result` });

  function save() {
    resultMutation.mutate(
      { our_score: our, opp_score: opp },
      { onSuccess: () => router.refresh() }
    );
  }

  const result = Number(our) >= Number(opp) ? "W" : "L";

  return (
    <Card>
      <CardContent>
        <h2 className="font-bold text-navy-900">Final score</h2>
        {!isCoach && !initial && <p className="mt-2 text-sm text-navy-400">No result recorded yet.</p>}

        {(isCoach || initial) && (
          <div className="mt-3 flex items-center gap-4">
            <ScoreBox label="Us" value={our} onChange={setOur} editable={isCoach} />
            <span className="text-2xl font-bold text-navy-300">–</span>
            <ScoreBox label={event.opponent || "Them"} value={opp} onChange={setOpp} editable={isCoach} />
            {(our || opp) ? (
              <Badge className={result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}>
                {result === "W" ? "Win" : "Loss"}
              </Badge>
            ) : null}
            {isCoach && (
              <Button onClick={save} disabled={resultMutation.isPending} className="ml-auto">
                {resultMutation.isPending ? "…" : "Save"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBox({ label, value, onChange, editable }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-xs font-medium text-navy-400">{label}</div>
      {editable ? (
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 rounded-xl border border-navy-100 py-2 text-center text-xl font-extrabold"
        />
      ) : (
        <div className="text-3xl font-extrabold text-navy-900">{value}</div>
      )}
    </div>
  );
}

// Full statistic names — labels come from sport config.
function StatsPanel({ event, players, initialStats, isCoach, isParent: parent, userId, stats = STATS }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // player id being edited
  const statMap = {};
  initialStats.forEach((s) => (statMap[s.user_id] = s));

  function canEdit(playerId) {
    if (parent) return false;
    return isCoach || playerId === userId;
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Player stats</h2>
          <span className="text-xs text-navy-400">
            {parent ? "View only" : isCoach ? "Coach can edit every player" : "Edit your own stats"}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="py-2">Player</th>
                {stats.map((c) => (
                  <th key={c.key} className="px-2 text-center">
                    {c.label}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const s = statMap[p.id];
                return (
                  <tr key={p.id} className="border-t border-navy-50">
                    <td className="py-2 font-medium text-navy-700">{p.name}</td>
                    {stats.map((c) => (
                      <td key={c.key} className="px-2 text-center text-navy-600">
                        {s ? formatStatValue(c, gameStatValue(c, s)) : "–"}
                      </td>
                    ))}
                    <td className="text-right">
                      {canEdit(p.id) && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setEditing(p.id)}
                          className="h-auto p-0 text-xs font-semibold text-brand-600"
                        >
                          {s ? "Edit" : "Add"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {editing && (
          <StatEditor
            eventId={event.id}
            playerId={editing}
            playerName={players.find((p) => p.id === editing)?.name}
            existing={statMap[editing]}
            stats={stats}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
