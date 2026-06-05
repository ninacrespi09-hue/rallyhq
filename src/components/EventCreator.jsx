"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isCompetitive, BONDING_KINDS, CONDITIONING_KINDS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation } from "@/hooks/use-api";

const TYPES = [
  { key: "practice",     label: "Practice" },
  { key: "conditioning", label: "Conditioning" },
  { key: "tournament",   label: "Tournament" },
  { key: "bonding",      label: "Team Bonding" },
];

export default function EventCreator({ defaultType = "practice" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const mutation = useApiMutation({ url: "/api/events" });

  function submit(e) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.type = type;
    body.title = title;

    mutation.mutate(body, {
      onSuccess: () => {
        setOpen(false);
        setTitle("");
        router.refresh();
      },
      onError: (err) => {
        setError(err.message || "Could not create event.");
      },
    });
  }

  function handleOpenChange(next) {
    setOpen(next);
    if (next) setType(defaultType);
  }

  return (
    <>
      {!open && (
        <Button
          onClick={() => {
            setType(defaultType);
            setOpen(true);
          }}
        >
          + New event
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md gap-0 p-5 sm:max-w-md">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New event</DialogTitle>
            </DialogHeader>

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
                  <Label>Quick ideas</Label>
                  <div className="flex flex-wrap gap-2">
                    {BONDING_KINDS.map((k) => (
                      <button key={k} type="button" onClick={() => setTitle(k)}
                        className="chip bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-100">
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {type === "conditioning" && (
                <div>
                  <Label>Quick ideas</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONING_KINDS.map((k) => (
                      <button key={k} type="button" onClick={() => setTitle(k)}
                        className="chip bg-blue-50 text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={
                    type === "bonding"
                      ? "Beach day at Cove Park"
                      : type === "conditioning"
                      ? "Cardio Session"
                      : type === "practice"
                      ? "Team Practice"
                      : "vs. Lincoln High"
                  }
                />
              </div>

              {isCompetitive(type) && (
                <div>
                  <Label>Opponent</Label>
                  <Input name="opponent" placeholder="Lincoln High" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input name="start_time" type="datetime-local" required />
                </div>
                <div>
                  <Label>End</Label>
                  <Input name="end_time" type="datetime-local" />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input name="location" placeholder="Main Gym" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} placeholder="Bring white jerseys" />
              </div>
            </div>

            {error && <p className="mt-2 text-sm text-blue-600">{error}</p>}

            <div className="mt-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="flex-1">
                {mutation.isPending ? "Saving…" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
