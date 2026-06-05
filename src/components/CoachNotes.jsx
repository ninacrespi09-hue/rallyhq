"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiMutation } from "@/hooks/use-api";

export default function CoachNotes({ playerId, notes, canEdit }) {
  const router = useRouter();
  const [text, setText] = useState("");

  const addMutation = useApiMutation({ url: `/api/players/${playerId}/notes` });
  const removeMutation = useApiMutation({ url: `/api/players/${playerId}/notes`, method: "DELETE" });

  function add() {
    if (!text.trim()) return;
    addMutation.mutate(
      { note: text },
      {
        onSuccess: () => {
          setText("");
          router.refresh();
        },
      }
    );
  }

  function remove(noteId) {
    removeMutation.mutate(
      { noteId },
      { onSuccess: () => router.refresh() }
    );
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-3 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a note about this player…"
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add} disabled={addMutation.isPending} className="shrink-0">
            {addMutation.isPending ? "…" : "Add"}
          </Button>
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
                  <button onClick={() => remove(n.id)} className="ml-auto text-blue-400 hover:text-blue-600">
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
