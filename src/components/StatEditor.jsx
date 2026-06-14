"use client";

import { useState } from "react";
import { STATS } from "@/lib/statDefs";
import { editableStatKeys } from "@/lib/statAgg";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiMutation } from "@/hooks/use-api";

export default function StatEditor({ eventId, playerName, playerId, existing, onClose, onSaved, stats = STATS }) {
  const editable = stats.filter((s) => s.editable !== false && s.agg !== "computed");
  const keys = editableStatKeys(stats);

  const [vals, setVals] = useState(() => {
    const v = {};
    keys.forEach((k) => (v[k] = existing?.[k] ?? 0));
    return v;
  });
  const [error, setError] = useState("");

  const mutation = useApiMutation({ url: `/api/events/${eventId}/stats` });

  function save() {
    setError("");
    const payload = { user_id: playerId };
    keys.forEach((k) => {
      payload[k] = vals[k];
    });
    mutation.mutate(payload, {
      onSuccess: () => onSaved(),
      onError: (err) => {
        setError(err.message || "Could not save stats.");
      },
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg gap-0 p-5">
        <DialogHeader>
          <DialogTitle>{playerName}</DialogTitle>
          <DialogDescription>Record stats for this game</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {editable.map((c) => (
            <div key={c.key}>
              <Label>{c.label}</Label>
              <Input
                type="number"
                min="0"
                max={c.max ?? undefined}
                value={vals[c.key]}
                onChange={(e) => setVals((v) => ({ ...v, [c.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-blue-700">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? "Saving…" : "Save stats"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
