"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SCALES = [
  { key: "soreness", label: "Soreness", low: "None", high: "Severe", invert: true },
  { key: "energy", label: "Energy", low: "Drained", high: "Great" },
  { key: "mood", label: "Mood", low: "Low", high: "Great" },
];

const AREAS = ["Shoulder", "Knee", "Ankle", "Back", "Wrist", "Hip", "Elbow"];

export default function CheckinForm({ existing }) {
  const router = useRouter();
  const [vals, setVals] = useState({
    soreness: existing?.soreness ?? 2,
    energy: existing?.energy ?? 4,
    mood: existing?.mood ?? 4,
  });
  const [injury, setInjury] = useState(!!existing?.injury);
  const [areas, setAreas] = useState(existing?.sore_areas ? existing.sore_areas.split(",") : []);
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleArea(a) {
    setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  }

  async function submit() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...vals, injury, sore_areas: areas.join(","), note }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <div className="card space-y-5">
      {SCALES.map((s) => (
        <div key={s.key}>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="font-medium text-slate-700">{s.label}</label>
            <span className="text-xs text-slate-400">
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
                      ? "bg-brand-600 text-white ring-brand-600"
                      : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
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
        <label className="mb-2 flex items-center gap-2 font-medium text-slate-700">
          <input
            type="checkbox"
            checked={injury}
            onChange={(e) => setInjury(e.target.checked)}
            className="h-4 w-4 rounded accent-brand-600"
          />
          I have an injury or pain to report
        </label>
        {injury && (
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArea(a)}
                className={`chip ring-1 transition ${
                  areas.includes(a)
                    ? "bg-red-100 text-red-700 ring-red-200"
                    : "bg-white text-slate-500 ring-slate-200"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">Notes for the coach (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="input"
          placeholder="Tweaked my ankle in the last set…"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : existing ? "Update check-in" : "Submit check-in"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
      </div>
    </div>
  );
}
