"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format";

export default function CoachNotes({ playerId, notes, canEdit }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch(`/api/players/${playerId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: text }),
    });
    setSaving(false);
    setText("");
    router.refresh();
  }

  async function remove(noteId) {
    await fetch(`/api/players/${playerId}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId }),
    });
    router.refresh();
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note about this player…"
            className="input"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button onClick={add} disabled={saving} className="btn-primary shrink-0">
            {saving ? "…" : "Add"}
          </button>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-navy-400">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-xl bg-navy-50/60 p-3">
              <p className="text-sm text-navy-700">{n.note}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-navy-400">
                <span>{n.author || "Coach"}</span>
                <span>·</span>
                <span>{fmtDate(n.created_at)}</span>
                {canEdit && (
                  <button onClick={() => remove(n.id)} className="ml-auto text-red-400 hover:text-red-600">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
