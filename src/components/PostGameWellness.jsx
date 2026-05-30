"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { wellnessLevel, LEVEL_STYLE, levelRank, RECOVERY_NEEDS } from "@/lib/wellness";

const SCALES = [
  { key: "soreness", label: "Soreness", emoji: "🤕", low: "None", high: "Severe", invert: true },
  { key: "energy", label: "Energy", emoji: "⚡", low: "Drained", high: "Great" },
  { key: "mood", label: "Mood", emoji: "😄", low: "Low", high: "Great" },
  { key: "recovery", label: "Recovery need", emoji: "🔋", low: "None", high: "A lot", invert: true },
];

const AREAS = ["Shoulder", "Knee", "Ankle", "Back", "Wrist", "Hip", "Elbow", "Hamstring"];
const NEEDS = RECOVERY_NEEDS;

export default function PostGameWellness({ event, user, players, submissions, mine }) {
  const isCoach = user.role === "coach";
  return (
    <section className="card border-l-4 border-brand-500">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-navy-900">🩺 Post-game wellness</h2>
        <span className="text-xs text-navy-400">
          {submissions.length}/{players.length} submitted
        </span>
      </div>

      {isCoach ? (
        <CoachSummary submissions={submissions} players={players} />
      ) : (
        <PlayerForm event={event} mine={mine} />
      )}
    </section>
  );
}

/* ------------------------------- Player form ------------------------------- */

function PlayerForm({ event, mine }) {
  const router = useRouter();
  const [vals, setVals] = useState({
    soreness: mine?.soreness ?? 2,
    energy: mine?.energy ?? 4,
    mood: mine?.mood ?? 4,
    recovery: mine?.recovery ?? 2,
  });
  const [injury, setInjury] = useState(!!mine?.injury);
  const [areas, setAreas] = useState(mine?.sore_areas ? mine.sore_areas.split(",") : []);
  const [needs, setNeeds] = useState(mine?.recovery_needs ? mine.recovery_needs.split(",") : []);
  const [note, setNote] = useState(mine?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (setter) => (item) =>
    setter((cur) => (cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item]));

  async function submit() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/events/${event.id}/wellness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...vals,
        injury,
        sore_areas: areas.join(","),
        recovery_needs: needs.join(","),
        note,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <div className="mt-4 space-y-5">
      <p className="text-sm text-navy-500">
        How do you feel after <b className="text-navy-700">{event.title}</b>? This helps your coach manage
        recovery and rest.
      </p>

      {SCALES.map((s) => (
        <div key={s.key}>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-medium text-navy-700">
              {s.emoji} {s.label}
            </label>
            <span className="text-xs text-navy-400">
              {s.low} → {s.high}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = vals[s.key] === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVals((v) => ({ ...v, [s.key]: n }))}
                  className={`rounded-xl py-3 text-sm font-bold ring-1 transition ${
                    active
                      ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white ring-brand-600 shadow-glow"
                      : "bg-white text-navy-400 ring-navy-100 hover:bg-navy-50"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-2 flex items-center gap-2 font-medium text-navy-700">
          <input
            type="checkbox"
            checked={injury}
            onChange={(e) => setInjury(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-600"
          />
          I picked up an injury or pain
        </label>
        {injury && (
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggle(setAreas)(a)}
                className={`chip ring-1 transition ${
                  areas.includes(a)
                    ? "bg-blue-100 text-blue-700 ring-blue-200"
                    : "bg-white text-navy-400 ring-navy-100"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">What recovery do you need?</label>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((nd) => (
            <button
              key={nd}
              type="button"
              onClick={() => toggle(setNeeds)(nd)}
              className={`chip ring-1 transition ${
                needs.includes(nd)
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-navy-500 ring-navy-100 hover:bg-navy-50"
              }`}
            >
              {nd}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Note for the coach (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="input"
          placeholder="Left shoulder felt tight serving in set 3…"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : mine ? "Update wellness" : "Submit wellness"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
      </div>
    </div>
  );
}

/* ------------------------------ Coach summary ------------------------------ */

function CoachSummary({ submissions, players }) {
  if (submissions.length === 0)
    return <p className="mt-3 text-sm text-navy-400">No players have submitted post-game wellness yet.</p>;

  const scored = submissions
    .map((s) => ({ ...s, ...wellnessLevel(s) }))
    .sort((a, b) => levelRank(b.level) - levelRank(a.level));

  const needRest = scored.filter((s) => s.level === "rest");

  return (
    <div className="mt-3 space-y-3">
      {needRest.length > 0 && (
        <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 ring-1 ring-blue-100">
          ⚠️ <b>{needRest.length}</b> player{needRest.length > 1 ? "s" : ""} may need rest:{" "}
          {needRest.map((p) => p.name).join(", ")}
        </div>
      )}

      <div className="space-y-2">
        {scored.map((s) => {
          const st = LEVEL_STYLE[s.level] || LEVEL_STYLE.ok;
          return (
            <div key={s.user_id} className="rounded-xl bg-navy-50/60 p-3">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                <span className="font-semibold text-navy-800">{s.name}</span>
                <span className={`chip ${st.chip}`}>{st.label}</span>
                <span className="ml-auto text-xs text-navy-400">
                  Sore {s.soreness} · Energy {s.energy} · Recovery {s.recovery}
                </span>
              </div>
              {s.recovery_needs && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.recovery_needs.split(",").map((n) => (
                    <span key={n} className="chip bg-white text-navy-600 ring-1 ring-navy-100">
                      {n}
                    </span>
                  ))}
                </div>
              )}
              {(s.injury || s.note) && (
                <p className="mt-2 text-sm text-navy-600">
                  {s.injury ? <span className="font-semibold text-blue-600">Injury{ s.sore_areas ? ` (${s.sore_areas})` : ""}. </span> : null}
                  {s.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
