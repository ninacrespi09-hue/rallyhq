"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isCompetitive, BONDING_KINDS } from "@/lib/format";

const TYPES = [
  { key: "practice", label: "Practice" },
  { key: "game", label: "Game" },
  { key: "tournament", label: "Tournament" },
  { key: "bonding", label: "Team Bonding" },
];

export default function EventCreator({ defaultType = "practice" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.type = type;
    body.title = title;

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Could not create event.");
    setOpen(false);
    setTitle("");
    router.refresh();
  }

  if (!open)
    return (
      <button
        onClick={() => {
          setType(defaultType);
          setOpen(true);
        }}
        className="btn-primary"
      >
        + New event
      </button>
    );

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <h2 className="text-lg font-bold text-navy-900">New event</h2>

        <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                type === t.key
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-navy-500 ring-navy-100 hover:bg-navy-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {type === "bonding" && (
            <div>
              <label className="label">Quick ideas</label>
              <div className="flex flex-wrap gap-2">
                {BONDING_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTitle(k)}
                    className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input"
              placeholder={
                type === "bonding"
                  ? "Beach day at Cove Park"
                  : type === "practice"
                  ? "Team Practice"
                  : "vs. Lincoln High"
              }
            />
          </div>

          {isCompetitive(type) && (
            <div>
              <label className="label">Opponent</label>
              <input name="opponent" className="input" placeholder="Lincoln High" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start</label>
              <input name="start_time" type="datetime-local" required className="input" />
            </div>
            <div>
              <label className="label">End</label>
              <input name="end_time" type="datetime-local" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input name="location" className="input" placeholder="Main Gym" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={2} className="input" placeholder="Bring white jerseys" />
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
            Cancel
          </button>
          <button disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
