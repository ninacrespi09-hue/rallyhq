"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { key: "practice",     label: "Practice" },
  { key: "conditioning", label: "Conditioning" },
  { key: "tournament",   label: "Tournament" },
  { key: "bonding",      label: "Team Bonding" },
];

export default function EventEditor({ event }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [type, setType] = useState(event.type || "practice");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.type = type;
    await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function del() {
    setDeleting(true);
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    router.push("/schedule");
    router.refresh();
  }

  // Format datetime-local value from ISO string
  const toLocal = (iso) => iso ? iso.slice(0, 16) : "";

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
          ✏️ Edit
        </button>
        <button onClick={() => setConfirmDelete(true)} className="btn text-sm bg-blue-100 text-blue-800 hover:bg-blue-200">
          🗑 Delete
        </button>
      </div>

      {/* Edit modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-2xl">
            <h2 className="text-lg font-bold text-navy-900">Edit event</h2>

            <div className="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TYPES.map((t) => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`rounded-xl py-2 text-xs font-semibold ring-1 transition ${
                    type === t.key ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-navy-500 ring-navy-100"
                  }`}
                >{t.label}</button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Title</label>
                <input name="title" required className="input" defaultValue={event.title} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start</label>
                  <input name="start_time" type="datetime-local" required className="input" defaultValue={toLocal(event.start_time)} />
                </div>
                <div>
                  <label className="label">End</label>
                  <input name="end_time" type="datetime-local" className="input" defaultValue={toLocal(event.end_time)} />
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <input name="location" className="input" defaultValue={event.location || ""} placeholder="Main Gym" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea name="notes" rows={2} className="input" defaultValue={event.notes || ""} />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">Cancel</button>
              <button disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
            <div className="text-3xl mb-3">🗑</div>
            <h2 className="text-lg font-bold text-navy-900">Delete this event?</h2>
            <p className="mt-1 text-sm text-navy-500">
              <b>{event.title}</b> will be permanently removed along with its attendance and stats.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={del} disabled={deleting} className="btn flex-1 bg-blue-700 text-white hover:bg-blue-800">
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
