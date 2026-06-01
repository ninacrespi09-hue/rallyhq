"use client";

import { useState } from "react";
import { STATS } from "@/lib/statDefs";

export default function StatEditor({ eventId, playerName, playerId, existing, onClose, onSaved }) {
  const [vals, setVals] = useState(() => {
    const v = {};
    STATS.forEach((c) => (v[c.key] = existing?.[c.key] ?? 0));
    return v;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/events/${eventId}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: playerId,
        ...vals,
        assists: existing?.assists ?? 0,
        errors: existing?.errors ?? 0,
        service_receptions: existing?.service_receptions ?? 0,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not save stats.");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <h3 className="text-lg font-bold text-navy-900">{playerName}</h3>
        <p className="mb-4 text-sm text-navy-400">Record stats for this game</p>
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((c) => (
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
        {error && <p className="mt-3 text-sm text-blue-700">{error}</p>}
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
