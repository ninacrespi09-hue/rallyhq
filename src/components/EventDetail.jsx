"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isCompetitive } from "@/lib/format";
import { STATS } from "@/lib/statDefs";

const STATUSES = ["present", "late", "absent", "excused"];
const STATUS_STYLE = {
  present: "bg-emerald-600 text-white ring-emerald-600",
  late: "bg-amber-500 text-white ring-amber-500",
  absent: "bg-red-500 text-white ring-red-500",
  excused: "bg-navy-400 text-white ring-navy-400",
};

export default function EventDetail({ event, user, players, initialAttendance, initialResult, initialStats }) {
  const router = useRouter();
  const isCoach = user.role === "coach";
  const isGame = isCompetitive(event.type);

  const [att, setAtt] = useState(() => {
    const map = {};
    initialAttendance.forEach((a) => (map[a.user_id] = a.status));
    return map;
  });

  async function setStatus(userId, status) {
    setAtt((m) => ({ ...m, [userId]: status }));
    await fetch(`/api/events/${event.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, status }),
    });
    router.refresh();
  }

  const present = Object.values(att).filter((s) => s === "present" || s === "late").length;

  return (
    <div className="space-y-5">
      {/* Attendance */}
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
            const editable = isCoach || mine;
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
        {!isCoach && (
          <p className="mt-3 text-xs text-navy-400">You can set your own attendance status.</p>
        )}
      </section>

      {/* Game result + stats */}
      {isGame && (
        <>
          <ResultPanel event={event} isCoach={isCoach} initial={initialResult} />
          <StatsPanel event={event} players={players} initialStats={initialStats} />
        </>
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
              className={`chip ${result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
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

function StatsPanel({ event, players, initialStats }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // player id being edited
  const statMap = {};
  initialStats.forEach((s) => (statMap[s.user_id] = s));

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy-900">Player stats</h2>
        <span className="text-xs text-navy-400">Anyone can help record</span>
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
                    <button
                      onClick={() => setEditing(p.id)}
                      className="text-xs font-semibold text-brand-600"
                    >
                      {s ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <StatEditor
          event={event}
          player={players.find((p) => p.id === editing)}
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

function StatEditor({ event, player, existing, onClose, onSaved }) {
  const [vals, setVals] = useState(() => {
    const v = {};
    STAT_COLS.forEach((c) => (v[c.key] = existing?.[c.key] ?? 0));
    return v;
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/events/${event.id}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: player.id, ...vals }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <h3 className="text-lg font-bold text-navy-900">{player.name}</h3>
        <p className="mb-4 text-sm text-navy-400">Record stats for this game</p>
        <div className="grid grid-cols-2 gap-3">
          {STAT_COLS.map((c) => (
            <div key={c.key}>
              <label className="label">{c.label}</label>
              <input
                type="number"
                min="0"
                value={vals[c.key]}
                onChange={(e) => setVals((v) => ({ ...v, [c.key]: e.target.value }))}
                className="input"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save stats"}
          </button>
        </div>
      </div>
    </div>
  );
}
