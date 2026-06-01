"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATS } from "@/lib/statDefs";

export default function CoachSeasonStats({ playerId, playerName, totals }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(() => {
    const v = {};
    STATS.forEach((s) => (v[s.key] = totals[s.key] ?? 0));
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEditor() {
    const v = {};
    STATS.forEach((s) => (v[s.key] = totals[s.key] ?? 0));
    setVals(v);
    setError("");
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/players/${playerId}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vals),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save season statistics.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-navy-900">Season Statistics</h2>
        <button type="button" onClick={openEditor} className="text-xs font-semibold text-brand-600">
          Edit
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STATS.map((s) => (
          <div key={s.key} className="rounded-xl bg-navy-50 p-3 text-center">
            <div className="text-2xl font-extrabold text-navy-900">{totals[s.key]}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{s.label}</div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
          <form
            onSubmit={save}
            className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-2xl"
          >
            <h3 className="text-lg font-bold text-navy-900">{playerName}</h3>
            <p className="mb-4 text-sm text-navy-400">Update season totals</p>
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <div key={s.key}>
                  <label className="label">{s.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={vals[s.key]}
                    onChange={(e) => setVals((v) => ({ ...v, [s.key]: e.target.value }))}
                    className="input"
                  />
                </div>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-blue-700">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save season stats"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
