"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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
      <Button onClick={() => setOpen(true)}>+ Post</Button>
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
            <Button
              key={val}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCategory(val)}
              className={cn(
                "h-auto rounded-xl py-2 text-xs font-semibold ring-1",
                category === val ? "bg-brand-600 text-white ring-brand-600 hover:bg-brand-600" : "bg-white text-navy-500 ring-navy-100 hover:bg-white"
              )}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input name="title" required placeholder="Practice moved to 6pm" />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea name="body" required rows={4} placeholder="Write your message…" />
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
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button disabled={saving} className="flex-1">
            {saving ? "Posting…" : "Post to team"}
          </Button>
        </div>
      </form>
    </div>
  );
}
