"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isCompetitive } from "@/lib/format";
import { STATS } from "@/lib/statDefs";
import StatEditor from "./StatEditor";
import { isCoach, isParent, isPlayer, canManageRsvp, canRsvp } from "@/lib/permissions";

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

export default function EventDetail({ event, user, players, initialAttendance, initialRsvps = [], initialResult, initialStats }) {
  const router = useRouter();
  const coach = isCoach(user);
  const parent = isParent(user);
  const player = isPlayer(user);
  const isGame = isCompetitive(event.type);

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

  async function setRsvpStatus(userId, status) {
    setRsvp((m) => ({ ...m, [userId]: status }));
    await fetch(`/api/events/${event.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, status }),
    });
  }

  async function clearRsvp(userId) {
    setRsvp((m) => {
      const next = { ...m };
      delete next[userId];
      return next;
    });
    await fetch(`/api/events/${event.id}/rsvp`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async function setStatus(userId, status) {
    setAtt((m) => ({ ...m, [userId]: status }));
    await fetch(`/api/events/${event.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, status }),
    });
  }

  const present = Object.values(att).filter((s) => s === "present" || s === "late").length;

  return (
    <div className="space-y-5">
      {/* RSVP / availability (pre-event) */}
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-navy-900">RSVP</h2>
          <span className="text-sm text-navy-400">
            {rsvpResponded}/{players.length} responded
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {RSVP_OPTIONS.map(({ key, label }) => (
            <span key={key} className={`chip ring-1 ${RSVP_STYLE[key]}`}>
              {label}: {rsvpCounts[key]}
            </span>
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
                      <button
                        key={key}
                        disabled={!editable}
                        onClick={() => setRsvpStatus(p.id, key)}
                        className={`chip ring-1 transition disabled:opacity-40 ${
                          status === key ? RSVP_STYLE[key] : "bg-white text-navy-500 ring-navy-100"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    {editable && status && (
                      <button
                        onClick={() => clearRsvp(p.id)}
                        className="chip bg-white text-navy-400 ring-navy-100"
                      >
                        Clear
                      </button>
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
      </section>

      {/* Attendance — hidden for games/tournaments (RSVP-only view) */}
      {!isGame && (
      <section className="card">
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
                    <button
                      key={st}
                      disabled={!editable}
                      onClick={() => setStatus(p.id, st)}
                      className={`chip capitalize ring-1 transition disabled:opacity-40 ${
                        status === st ? STATUS_STYLE[st] : "bg-white text-navy-500 ring-navy-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {!coach && !parent && (
          <p className="mt-3 text-xs text-navy-400">You can set your own attendance status.</p>
        )}
      </section>
      )}
    </div>
  );
}

function ResultPanel({ event, isCoach, initial }) {
  const router = useRouter();
  const [our, setOur] = useState(initial?.our_score ?? 0);
  const [opp, setOpp] = useState(initial?.opp_score ?? 0);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/events/${event.id}/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ our_score: our, opp_score: opp }),
    });
    setSaving(false);
    router.refresh();
  }

  const result = Number(our) >= Number(opp) ? "W" : "L";

  return (
    <section className="card">
      <h2 className="font-bold text-navy-900">Final score</h2>
      {!isCoach && !initial && <p className="mt-2 text-sm text-navy-400">No result recorded yet.</p>}

      {(isCoach || initial) && (
        <div className="mt-3 flex items-center gap-4">
          <ScoreBox label="Us" value={our} onChange={setOur} editable={isCoach} />
          <span className="text-2xl font-bold text-navy-300">–</span>
          <ScoreBox label={event.opponent || "Them"} value={opp} onChange={setOpp} editable={isCoach} />
          {(our || opp) ? (
            <span
              className={`chip ${result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}
            >
              {result === "W" ? "Win" : "Loss"}
            </span>
          ) : null}
          {isCoach && (
            <button onClick={save} disabled={saving} className="btn-primary ml-auto">
              {saving ? "…" : "Save"}
            </button>
          )}
        </div>
      )}
    </section>
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

// Full statistic names (no abbreviations): Kills, Hits, Blocks, Digs, Serve Aces.
const STAT_COLS = STATS;

function StatsPanel({ event, players, initialStats, isCoach, isParent: parent, userId }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // player id being edited
  const statMap = {};
  initialStats.forEach((s) => (statMap[s.user_id] = s));

  function canEdit(playerId) {
    if (parent) return false;
    return isCoach || playerId === userId;
  }

  return (
    <section className="card">
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
              {STAT_COLS.map((c) => (
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
                  {STAT_COLS.map((c) => (
                    <td key={c.key} className="px-2 text-center text-navy-600">
                      {s ? s[c.key] : "–"}
                    </td>
                  ))}
                  <td className="text-right">
                    {canEdit(p.id) && (
                      <button
                        onClick={() => setEditing(p.id)}
                        className="text-xs font-semibold text-brand-600"
                      >
                        {s ? "Edit" : "Add"}
                      </button>
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
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
