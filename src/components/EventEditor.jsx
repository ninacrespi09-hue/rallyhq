"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation } from "@/hooks/use-api";

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

  const saveMutation = useApiMutation({ url: `/api/events/${event.id}`, method: "PATCH" });
  const deleteMutation = useApiMutation({ url: `/api/events/${event.id}`, method: "DELETE" });

  function save(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    body.type = type;
    saveMutation.mutate(body, {
      onSuccess: () => {
        setOpen(false);
        router.refresh();
      },
    });
  }

  function del() {
    deleteMutation.mutate(null, {
      onSuccess: () => {
        router.push("/schedule");
        router.refresh();
      },
    });
  }

  // Format datetime-local value from ISO string
  const toLocal = (iso) => iso ? iso.slice(0, 16) : "";

  return (
    <>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          ✏️ Edit
        </Button>
        <Button
          size="sm"
          className="bg-blue-100 text-blue-800 hover:bg-blue-200"
          onClick={() => setConfirmDelete(true)}
        >
          🗑 Delete
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-md gap-0 overflow-y-auto p-5">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>Edit event</DialogTitle>
            </DialogHeader>

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
                <Label>Title</Label>
                <Input name="title" required defaultValue={event.title} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input name="start_time" type="datetime-local" required defaultValue={toLocal(event.start_time)} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input name="end_time" type="datetime-local" defaultValue={toLocal(event.end_time)} />
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input name="location" defaultValue={event.location || ""} placeholder="Main Gym" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} defaultValue={event.notes || ""} />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm text-center">
          <div className="text-3xl mb-3">🗑</div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Delete this event?</DialogTitle>
            <DialogDescription>
              <b>{event.title}</b> will be permanently removed along with its attendance and stats.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex gap-3">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">Cancel</Button>
            <Button
              onClick={del}
              disabled={deleteMutation.isPending}
              className="flex-1 bg-blue-700 text-white hover:bg-blue-800"
            >
              {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
