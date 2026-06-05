"use client";

import { useState } from "react";
import { STATS } from "@/lib/statDefs";
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

export default function StatEditor({ eventId, playerName, playerId, existing, onClose, onSaved }) {
  const [vals, setVals] = useState(() => {
    const v = {};
    STATS.forEach((c) => (v[c.key] = existing?.[c.key] ?? 0));
    return v;
  });
  const [error, setError] = useState("");

  const mutation = useApiMutation({ url: `/api/events/${eventId}/stats` });

  function save() {
    setError("");
    mutation.mutate(
      {
        user_id: playerId,
        ...vals,
        assists: existing?.assists ?? 0,
        errors: existing?.errors ?? 0,
        service_receptions: existing?.service_receptions ?? 0,
      },
      {
        onSuccess: () => onSaved(),
        onError: (err) => {
          setError(err.message || "Could not save stats.");
        },
      }
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 p-5">
        <DialogHeader>
          <DialogTitle>{playerName}</DialogTitle>
          <DialogDescription>Record stats for this game</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((c) => (
            <div key={c.key}>
              <Label>{c.label}</Label>
              <Input
                type="number"
                min="0"
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
