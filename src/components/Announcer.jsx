"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Announcer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("announcement");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, category, pinned }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Post
      </button>
    );

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <h2 className="text-lg font-bold text-navy-900">New post</h2>

        <div className="my-3 grid grid-cols-3 gap-2">
          {[
            ["announcement", "📣 Announce"],
            ["exercise", "💪 Exercise"],
            ["info", "ℹ️ Info"],
          ].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setCategory(val)}
              className={`rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                category === val ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-navy-500 ring-navy-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input name="title" required className="input" placeholder="Practice moved to 6pm" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea name="body" required rows={4} className="input" placeholder="Write your message…" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-navy-700">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            📌 Pin to top
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
            Cancel
          </button>
          <button disabled={saving} className="btn-primary flex-1">
            {saving ? "Posting…" : "Post to team"}
          </button>
        </div>
      </form>
    </div>
  );
}
