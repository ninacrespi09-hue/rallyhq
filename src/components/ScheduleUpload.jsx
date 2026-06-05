"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventStyle } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const SCAN_TIMEOUT_MS = 45000;

const SCHEDULE_EVENT_TYPES = [
  { key: "practice", label: "Practice" },
  { key: "game", label: "Game" },
  { key: "tournament", label: "Tournament" },
  { key: "conditioning", label: "Conditioning" },
  { key: "bonding", label: "Team Bonding" },
  { key: "meeting", label: "Meeting" },
  { key: "other", label: "Other" },
];

function draftFromApi(e, index) {
  return {
    key: `draft-${index}-${Date.now()}`,
    included: true,
    type: e.type || "practice",
    title: e.title || "",
    date: e.date || "",
    start_time: e.start_time || "",
    end_time: e.end_time || "",
    location: e.location || "",
    opponent: e.opponent || "",
    notes: e.notes || "",
  };
}

function emptyDraft() {
  return draftFromApi(
    {
      type: "practice",
      title: "Team Practice",
      date: new Date().toISOString().slice(0, 10),
      start_time: "15:30",
      end_time: "17:30",
      location: "",
      opponent: "",
      notes: "",
    },
    0
  );
}

export default function ScheduleUpload({ compact = false }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [source, setSource] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [events, setEvents] = useState([]);

  async function processFile(file) {
    if (!file) return;
    setScanning(true);
    setError("");
    setInfo("");
    setPreviewName(file.name);

    const body = new FormData();
    body.append("file", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const res = await fetch("/api/schedule/scan", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not scan the schedule.");
        setEvents([emptyDraft()]);
        setSource("manual");
        setInfo("Edit the events below, then save.");
        setOpen(true);
        return;
      }

      setEvents((data.events || []).map((e, i) => draftFromApi(e, i)));
      setSource(data.source || "");
      setInfo(data.message || "Review events before saving.");
      setOpen(true);
    } catch (err) {
      clearTimeout(timeoutId);
      setError(
        err.name === "AbortError"
          ? "Scan timed out. Edit the events manually, then save."
          : "Could not scan the schedule."
      );
      setEvents([emptyDraft()]);
      setSource("manual");
      setInfo("Edit the events below, then save.");
      setOpen(true);
    } finally {
      setScanning(false);
    }
  }

  function openManual() {
    setError("");
    setInfo("Add or edit events, then save to the team calendar.");
    setSource("manual");
    setPreviewName("");
    setEvents([emptyDraft()]);
    setOpen(true);
  }

  function updateEvent(index, patch) {
    setEvents((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function addEvent() {
    setEvents((list) => [...list, emptyDraft()]);
  }

  function removeEvent(index) {
    setEvents((list) => list.filter((_, i) => i !== index));
  }

  async function saveEvents() {
    const selected = events.filter((e) => e.included);
    if (selected.length === 0) {
      setError("Select at least one event to save.");
      return;
    }
    for (const e of selected) {
      if (!e.title?.trim() || !e.date || !e.start_time) {
        setError("Each selected event needs a title, date, and start time.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/schedule/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save events.");
        return;
      }
      setOpen(false);
      setInfo(data.message || "Schedule saved.");
      router.refresh();
    } catch {
      setError("Could not save events. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          processFile(f);
        }}
      />

      {compact ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
        >
          {scanning ? "Scanning…" : "Upload schedule"}
        </Button>
      ) : (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-navy-900">Upload Schedule Photo</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Upload a photo of your schedule and RallyHQ will help fill in upcoming events automatically.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={scanning}
                  className="w-full sm:w-auto"
                >
                  {scanning ? "Scanning…" : "Upload Schedule Photo"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={openManual}
                  className="h-auto p-0 text-xs font-semibold text-brand-600"
                >
                  Enter events manually instead
                </Button>
              </div>
            </div>

            {info && !open && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
            {error && !open && <p className="mt-3 text-sm text-blue-700">{error}</p>}
          </CardContent>
        </Card>
      )}

      {info && compact && !open && <span className="sr-only">{info}</span>}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 p-0 md:left-1/2 md:top-1/2 md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border">
          <SheetHeader className="border-b border-navy-50 p-5 text-left">
            <SheetTitle>Review schedule</SheetTitle>
            <SheetDescription>
              {previewName ? `From ${previewName}. ` : ""}
              {info}
              {source === "mock" && (
                <span className="block text-xs text-navy-400">Using sample data — edit before saving.</span>
              )}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 p-5">
            <div className="space-y-3 pr-3">
              {events.map((ev, index) => {
                const s = getEventStyle(ev.type);
                const typeLabel = SCHEDULE_EVENT_TYPES.find((t) => t.key === ev.type)?.label || s.label;
                return (
                  <Card
                    key={ev.key}
                    className={`space-y-3 ${ev.included ? s.ring : "opacity-60"} ${ev.included ? s.bg : ""}`}
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ev.included}
                          onChange={(e) => updateEvent(index, { included: e.target.checked })}
                          className="h-4 w-4 rounded accent-brand-600"
                        />
                        <span className={`chip ${s.chip}`}>{typeLabel}</span>
                        {events.length > 1 && (
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => removeEvent(index)}
                            className="ml-auto h-auto p-0 text-xs font-semibold text-navy-400 hover:text-blue-600"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <div>
                        <Label>Type</Label>
                        <select
                          value={ev.type}
                          onChange={(e) => updateEvent(index, { type: e.target.value })}
                          className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
                        >
                          {SCHEDULE_EVENT_TYPES.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label>Title</Label>
                        <Input
                          value={ev.title}
                          onChange={(e) => updateEvent(index, { title: e.target.value })}
                          className="mt-1.5"
                          placeholder="Team Practice"
                        />
                      </div>

                      {(ev.type === "game" || ev.type === "tournament") && (
                        <div>
                          <Label>Opponent</Label>
                          <Input
                            value={ev.opponent}
                            onChange={(e) => updateEvent(index, { opponent: e.target.value })}
                            className="mt-1.5"
                            placeholder="Lincoln High"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={ev.date}
                            onChange={(e) => updateEvent(index, { date: e.target.value })}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>Location</Label>
                          <Input
                            value={ev.location}
                            onChange={(e) => updateEvent(index, { location: e.target.value })}
                            className="mt-1.5"
                            placeholder="Main Gym"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={ev.start_time}
                            onChange={(e) => updateEvent(index, { start_time: e.target.value })}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={ev.end_time}
                            onChange={(e) => updateEvent(index, { end_time: e.target.value })}
                            className="mt-1.5"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={ev.notes}
                          onChange={(e) => updateEvent(index, { notes: e.target.value })}
                          rows={2}
                          className="mt-1.5"
                          placeholder="Optional details"
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Button type="button" variant="ghost" onClick={addEvent} className="w-full text-sm">
                + Add another event
              </Button>
            </div>
          </ScrollArea>

          {error && <p className="px-5 pb-2 text-sm text-blue-700">{error}</p>}

          <SheetFooter className="flex-row gap-2 border-t border-navy-50 p-5">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="button" onClick={saveEvents} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save to schedule"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
