"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getEventStyle } from "@/lib/format";

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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="btn-ghost ring-1 ring-navy-100"
        >
          {scanning ? "Scanning…" : "Upload schedule"}
        </button>
      ) : (
        <section className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold text-navy-900">Upload Schedule Photo</h2>
              <p className="mt-1 text-sm text-navy-500">
                Upload a photo of your schedule and RallyHQ will help fill in upcoming events automatically.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={scanning}
                className="btn-primary w-full sm:w-auto"
              >
                {scanning ? "Scanning…" : "Upload Schedule Photo"}
              </button>
              <button type="button" onClick={openManual} className="text-xs font-semibold text-brand-600">
                Enter events manually instead
              </button>
            </div>
          </div>

          {info && !open && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
          {error && !open && <p className="mt-3 text-sm text-blue-700">{error}</p>}
        </section>
      )}

      {info && compact && !open && <span className="sr-only">{info}</span>}

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white md:rounded-2xl">
            <div className="border-b border-navy-50 p-5">
              <h3 className="text-lg font-bold text-navy-900">Review schedule</h3>
              <p className="mt-1 text-sm text-navy-400">
                {previewName ? `From ${previewName}. ` : ""}
                {info}
                {source === "mock" && (
                  <span className="block text-xs text-navy-400">Using sample data — edit before saving.</span>
                )}
              </p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {events.map((ev, index) => {
                const s = getEventStyle(ev.type);
                const typeLabel = SCHEDULE_EVENT_TYPES.find((t) => t.key === ev.type)?.label || s.label;
                return (
                  <div
                    key={ev.key}
                    className={`card space-y-3 ${ev.included ? s.ring : "opacity-60"} ${ev.included ? s.bg : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={ev.included}
                        onChange={(e) => updateEvent(index, { included: e.target.checked })}
                        className="h-4 w-4 rounded accent-brand-600"
                      />
                      <span className={`chip ${s.chip}`}>{typeLabel}</span>
                      {events.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEvent(index)}
                          className="ml-auto text-xs font-semibold text-navy-400 hover:text-blue-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="label">Type</label>
                      <select
                        value={ev.type}
                        onChange={(e) => updateEvent(index, { type: e.target.value })}
                        className="input"
                      >
                        {SCHEDULE_EVENT_TYPES.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Title</label>
                      <input
                        value={ev.title}
                        onChange={(e) => updateEvent(index, { title: e.target.value })}
                        className="input"
                        placeholder="Team Practice"
                      />
                    </div>

                    {(ev.type === "game" || ev.type === "tournament") && (
                      <div>
                        <label className="label">Opponent</label>
                        <input
                          value={ev.opponent}
                          onChange={(e) => updateEvent(index, { opponent: e.target.value })}
                          className="input"
                          placeholder="Lincoln High"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Date</label>
                        <input
                          type="date"
                          value={ev.date}
                          onChange={(e) => updateEvent(index, { date: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">Location</label>
                        <input
                          value={ev.location}
                          onChange={(e) => updateEvent(index, { location: e.target.value })}
                          className="input"
                          placeholder="Main Gym"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Start</label>
                        <input
                          type="time"
                          value={ev.start_time}
                          onChange={(e) => updateEvent(index, { start_time: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="label">End</label>
                        <input
                          type="time"
                          value={ev.end_time}
                          onChange={(e) => updateEvent(index, { end_time: e.target.value })}
                          className="input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">Notes</label>
                      <textarea
                        value={ev.notes}
                        onChange={(e) => updateEvent(index, { notes: e.target.value })}
                        rows={2}
                        className="input"
                        placeholder="Optional details"
                      />
                    </div>
                  </div>
                );
              })}

              <button type="button" onClick={addEvent} className="btn-ghost w-full text-sm">
                + Add another event
              </button>
            </div>

            {error && <p className="px-5 pb-2 text-sm text-blue-700">{error}</p>}

            <div className="flex gap-2 border-t border-navy-50 p-5">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="button" onClick={saveEvents} disabled={saving} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save to schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
