"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SHEET_STAT_KEYS } from "@/lib/statSheetDefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const SCAN_TIMEOUT_MS = 30000;

function emptyMatch() {
  return { date: "", opponent: "", set_scores: [], our_score: "", opp_score: "" };
}

function emptyRow(rosterPlayer) {
  return {
    name: rosterPlayer?.name || "",
    jersey_number: rosterPlayer?.jersey_number != null ? String(rosterPlayer.jersey_number) : "",
    user_id: rosterPlayer?.id ?? null,
    aces: "",
    service_errors: "",
    kills: "",
    hitting_errors: "",
    assists: "",
    digs: "",
    blocks: "",
    service_receptions: "",
    hits: "",
  };
}

function defaultRows(roster) {
  if (roster.length) return roster.map((p) => emptyRow(p));
  return [emptyRow(null)];
}

async function prepareImageFile(file) {
  if (typeof window === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 2200;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function StatSheetUpload({ roster, manualOnly = false }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [match, setMatch] = useState(emptyMatch());
  const [rows, setRows] = useState([]);
  const [previewName, setPreviewName] = useState("");

  useEffect(() => {
    if (!manualOnly) return;
    setMatch(emptyMatch());
    setRows(defaultRows(roster));
    setInfo("Enter stats manually, then save when ready.");
    setPreviewName("");
    setPreviewOpen(true);
    setError("");
  }, [manualOnly, roster]);

  async function processFile(file) {
    if (!file) return;

    setScanning(true);
    setError("");
    setInfo("");
    setPreviewName(file.name);

    let prepared = file;
    try {
      prepared = await prepareImageFile(file);
    } catch {
      /* use original file */
    }

    const body = new FormData();
    body.append("file", prepared);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const res = await fetch("/api/stats/scan", {
        method: "POST",
        body,
        signal: controller.signal,
        headers: { "x-scan-id": `scan-${Date.now()}` },
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.error ||
            (res.status === 408
              ? "Scan timed out. You can edit the table manually below."
              : "Could not scan the stat sheet.")
        );
        if (data.match) {
          setMatch({
            date: data.match?.date || "",
            opponent: data.match?.opponent || "",
            set_scores: Array.isArray(data.match?.set_scores) ? [...data.match.set_scores] : [],
            our_score: data.match?.our_score != null ? String(data.match.our_score) : "",
            opp_score: data.match?.opp_score != null ? String(data.match.opp_score) : "",
          });
        }
        setRows(data.players?.length ? data.players : defaultRows(roster));
        setInfo(data.message || "Review and complete any blank fields, then save.");
        setPreviewOpen(true);
        return;
      }

      setMatch({
        date: data.match?.date || "",
        opponent: data.match?.opponent || "",
        set_scores: Array.isArray(data.match?.set_scores) ? [...data.match.set_scores] : [],
        our_score: data.match?.our_score != null ? String(data.match.our_score) : "",
        opp_score: data.match?.opp_score != null ? String(data.match.opp_score) : "",
      });

      setRows(data.players?.length > 0 ? data.players : defaultRows(roster));
      setInfo(data.message || "Review the scanned stats before saving.");
      setPreviewOpen(true);
    } catch (err) {
      clearTimeout(timeoutId);
      setError(
        err.name === "AbortError"
          ? "Scan timed out. Edit the table manually, then save."
          : "Could not scan the stat sheet. Try again or enter stats manually."
      );
      setMatch(emptyMatch());
      setRows(defaultRows(roster));
      setInfo("Enter stats manually, then save when ready.");
      setPreviewOpen(true);
    } finally {
      setScanning(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    await processFile(file);
  }

  function openManualEntry() {
    setMatch(emptyMatch());
    setRows(defaultRows(roster));
    setInfo("Enter stats manually, then save when ready.");
    setPreviewName("");
    setPreviewOpen(true);
    setError("");
  }

  function updateRow(index, key, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function updateMatch(key, value) {
    setMatch((m) => ({ ...m, [key]: value }));
  }

  function updateSetScore(index, value) {
    setMatch((m) => {
      const next = [...(m.set_scores || [])];
      next[index] = value;
      return { ...m, set_scores: next };
    });
  }

  function addSetScore() {
    setMatch((m) => ({ ...m, set_scores: [...(m.set_scores || []), ""] }));
  }

  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Player",
        cell: ({ row }) => (
          <Input
            value={row.original.name}
            onChange={(e) => updateRow(row.index, "name", e.target.value)}
            className="min-w-[120px]"
            placeholder="Name"
          />
        ),
      },
      {
        id: "jersey",
        header: "#",
        cell: ({ row }) => (
          <Input
            value={row.original.jersey_number}
            onChange={(e) => updateRow(row.index, "jersey_number", e.target.value)}
            className="w-16"
            placeholder="#"
          />
        ),
      },
      {
        id: "roster",
        header: "Roster match",
        cell: ({ row }) => (
          <select
            value={row.original.user_id ?? ""}
            onChange={(e) =>
              updateRow(row.index, "user_id", e.target.value ? Number(e.target.value) : null)
            }
            className="flex h-10 w-full min-w-[140px] rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
          >
            <option value="">Not linked</option>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.jersey_number != null ? ` (#${p.jersey_number})` : ""}
              </option>
            ))}
          </select>
        ),
      },
      ...SHEET_STAT_KEYS.map((col) => ({
        id: col.key,
        header: () => <span className="block text-center">{col.label}</span>,
        cell: ({ row }) => (
          <Input
            type={col.type === "text" ? "text" : "number"}
            min={col.type === "text" ? undefined : "0"}
            step={col.type === "text" ? "0.1" : "1"}
            value={row.original[col.key] ?? ""}
            onChange={(e) => updateRow(row.index, col.key, e.target.value)}
            className="w-20 text-center"
            placeholder="—"
          />
        ),
      })),
    ],
    [roster, rows]
  );

  async function saveStats() {
    const linked = rows.filter((r) => r.user_id);
    const unlinked = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !r.user_id && r.name?.trim());

    let createMissingPlayers = [];
    if (unlinked.length) {
      const names = unlinked.map(({ r }) => r.name.trim()).join(", ");
      const ok = window.confirm(
        `Add ${unlinked.length} new player${unlinked.length === 1 ? "" : "s"} to your roster?\n\n${names}`
      );
      if (ok) createMissingPlayers = unlinked.map(({ i }) => i);
    }

    if (!linked.length && !createMissingPlayers.length) {
      setError("Link at least one player to your roster before saving.");
      return;
    }

    if (!match.opponent?.trim()) {
      setError("Enter an opponent name before saving.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/stats/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scan-id": `save-${Date.now()}`,
        },
        body: JSON.stringify({
          match: {
            ...match,
            set_scores: (match.set_scores || []).map((s) => s.trim()).filter(Boolean),
          },
          players: rows,
          createMissingPlayers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save stats.");
        return;
      }

      setPreviewOpen(false);
      let msg = data.message || `Saved stats for ${data.saved} player${data.saved === 1 ? "" : "s"}.`;
      if (data.createdPlayers?.length) {
        msg += ` Added ${data.createdPlayers.length} new player${data.createdPlayers.length === 1 ? "" : "s"} to roster.`;
      }
      if (data.skipped?.length) {
        msg += ` Skipped ${data.skipped.length} row${data.skipped.length === 1 ? "" : "s"} without a roster match.`;
      }
      setInfo(msg);
      router.refresh();
    } catch {
      setError("Could not save stats. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!manualOnly && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold text-navy-900">Upload Stat Sheet</h2>
                <p className="mt-1 text-sm text-navy-500">
                  Upload a photo of your volleyball stat sheet and RallyHQ will help fill in the stats automatically.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={scanning}
                  className="w-full sm:w-auto"
                >
                  {scanning ? "Scanning…" : "Upload Stat Sheet"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={openManualEntry}
                  className="h-auto p-0 text-xs font-semibold text-brand-600"
                >
                  Enter manually instead
                </Button>
              </div>
            </div>

            {info && !previewOpen && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
            {error && !previewOpen && <p className="mt-3 text-sm text-blue-700">{error}</p>}
          </CardContent>
        </Card>
      )}

      {manualOnly && info && !previewOpen && <p className="text-sm text-emerald-700">{info}</p>}

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="flex max-h-[92vh] flex-col gap-0 p-0 md:left-1/2 md:top-1/2 md:max-w-5xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border">
          <SheetHeader className="border-b border-navy-50 p-5 text-left">
            <SheetTitle>{manualOnly ? "Enter stats" : "Review scanned stats"}</SheetTitle>
            <SheetDescription>
              {manualOnly
                ? "Fill in match details and player stats, then save."
                : `${previewName ? `From ${previewName}. ` : ""}Edit anything that looks wrong, then save.`}
            </SheetDescription>
            {info && <p className="mt-2 text-sm text-navy-500">{info}</p>}
          </SheetHeader>

          <ScrollArea className="flex-1 p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Match date</Label>
                <Input
                  type="date"
                  value={match.date}
                  onChange={(e) => updateMatch("date", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Opponent</Label>
                <Input
                  value={match.opponent}
                  onChange={(e) => updateMatch("opponent", e.target.value)}
                  className="mt-1.5"
                  placeholder="Opponent team"
                />
              </div>
              <div>
                <Label>Sets won (us)</Label>
                <Input
                  type="number"
                  min="0"
                  value={match.our_score}
                  onChange={(e) => updateMatch("our_score", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Sets won (them)</Label>
                <Input
                  type="number"
                  min="0"
                  value={match.opp_score}
                  onChange={(e) => updateMatch("opp_score", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="mb-0">Set scores</Label>
                <Button
                  type="button"
                  variant="link"
                  onClick={addSetScore}
                  className="h-auto p-0 text-xs font-semibold text-brand-600"
                >
                  + Add set
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(match.set_scores?.length ? match.set_scores : [""]).map((score, i) => (
                  <Input
                    key={i}
                    value={score}
                    onChange={(e) => updateSetScore(i, e.target.value)}
                    className="w-24"
                    placeholder="25-20"
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <DataTable columns={columns} data={rows} className="min-w-[880px] border-0 bg-transparent" />
            </div>

            {error && <p className="mt-3 text-sm text-blue-700">{error}</p>}
          </ScrollArea>

          <SheetFooter className="flex-row gap-2 border-t border-navy-50 p-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (manualOnly) {
                  router.push("/stats");
                  return;
                }
                setPreviewOpen(false);
                setError("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveStats} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save Stats"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
