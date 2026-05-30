"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// invert=true means low value = bad (soreness), low value = good otherwise
const SCALES = [
  { key: "soreness", label: "Soreness", invert: true },
  { key: "energy",   label: "Energy",   invert: false },
  { key: "mood",     label: "Mood",     invert: false },
];

const AREAS = ["Shoulder", "Knee", "Ankle", "Back", "Wrist", "Hip", "Elbow"];

// SVG outline faces — no fill, just a black stroke path
function SadFace() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="17" />
      <circle cx="13.5" cy="16" r="1.8" fill="black" stroke="none" />
      <circle cx="26.5" cy="16" r="1.8" fill="black" stroke="none" />
      <path d="M13 27 Q20 21 27 27" />
    </svg>
  );
}

function HappyFace() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="17" />
      <circle cx="13.5" cy="16" r="1.8" fill="black" stroke="none" />
      <circle cx="26.5" cy="16" r="1.8" fill="black" stroke="none" />
      <path d="M13 24 Q20 31 27 24" />
    </svg>
  );
}

function ScaleSlider({ scaleKey, label, invert, value, onChange }) {
  // Left face = bad end, right face = good end, adjusted by invert
  const leftBad  = !invert;  // for energy/mood: left(1)=bad, right(5)=good
  const pct = ((value - 1) / 4) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="font-medium text-navy-700">{label}</label>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
          {value}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Left face */}
        <div className="shrink-0">
          {leftBad ? <SadFace /> : <HappyFace />}
        </div>

        {/* Draggable track */}
        <div className="relative flex-1 py-2">
          {/* Track line */}
          <div className="relative h-1.5 w-full rounded-full bg-navy-100">
            {/* Filled portion */}
            <div
              className="absolute left-0 top-0 h-1.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Native range input layered over for interaction */}
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            style={{ height: "100%" }}
          />

          {/* Visual dot */}
          <div
            className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-brand-600 shadow-glow ring-2 ring-white transition-all"
            style={{ left: `calc(${pct}% - 12px)` }}
          />
        </div>

        {/* Right face */}
        <div className="shrink-0">
          {leftBad ? <HappyFace /> : <SadFace />}
        </div>
      </div>
    </div>
  );
}

export default function CheckinForm({ existing }) {
  const router = useRouter();
  const [vals, setVals] = useState({
    soreness: existing?.soreness ?? 2,
    energy:   existing?.energy   ?? 4,
    mood:     existing?.mood     ?? 4,
  });
  const [injury, setInjury] = useState(!!existing?.injury);
  const [areas, setAreas] = useState(
    existing?.sore_areas ? existing.sore_areas.split(",") : []
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleArea(a) {
    setAreas((cur) =>
      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]
    );
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
    <div className="space-y-6 rounded-2xl bg-blue-400/20 p-5 backdrop-blur-sm ring-1 ring-blue-300/40">
      {SCALES.map((s) => (
        <ScaleSlider
          key={s.key}
          scaleKey={s.key}
          label={s.label}
          invert={s.invert}
          value={vals[s.key]}
          onChange={(v) => setVals((prev) => ({ ...prev, [s.key]: v }))}
        />
      ))}

      <div>
        <label className="mb-2 flex items-center gap-2 font-medium text-navy-700">
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
                    ? "bg-blue-100 text-blue-700 ring-blue-200"
                    : "bg-white text-navy-500 ring-navy-100"
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
        {saved && (
          <span className="text-sm font-medium text-emerald-600">✓ Saved</span>
        )}
      </div>
    </div>
  );
}
