"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SHEET_STAT_KEYS } from "@/lib/statSheetDefs";

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

export default function StatSheetUpload({ roster }) {
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
      <section className="card">
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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="btn-primary w-full sm:w-auto"
            >
              {scanning ? "Scanning…" : "Upload Stat Sheet"}
            </button>
            <button type="button" onClick={openManualEntry} className="text-xs font-semibold text-brand-600">
              Enter manually instead
            </button>
          </div>
        </div>

        {info && !previewOpen && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
        {error && !previewOpen && <p className="mt-3 text-sm text-blue-700">{error}</p>}
      </section>

      {previewOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center md:p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-t-3xl bg-white md:rounded-2xl">
            <div className="border-b border-navy-50 p-5">
              <h3 className="text-lg font-bold text-navy-900">Review scanned stats</h3>
              <p className="mt-1 text-sm text-navy-400">
                {previewName ? `From ${previewName}. ` : ""}
                Edit anything that looks wrong, then save.
              </p>
              {info && <p className="mt-2 text-sm text-navy-500">{info}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">Match date</label>
                  <input
                    type="date"
                    value={match.date}
                    onChange={(e) => updateMatch("date", e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Opponent</label>
                  <input
                    value={match.opponent}
                    onChange={(e) => updateMatch("opponent", e.target.value)}
                    className="input"
                    placeholder="Opponent team"
                  />
                </div>
                <div>
                  <label className="label">Sets won (us)</label>
                  <input
                    type="number"
                    min="0"
                    value={match.our_score}
                    onChange={(e) => updateMatch("our_score", e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Sets won (them)</label>
                  <input
                    type="number"
                    min="0"
                    value={match.opp_score}
                    onChange={(e) => updateMatch("opp_score", e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="label mb-0">Set scores</label>
                  <button type="button" onClick={addSetScore} className="text-xs font-semibold text-brand-600">
                    + Add set
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(match.set_scores?.length ? match.set_scores : [""]).map((score, i) => (
                    <input
                      key={i}
                      value={score}
                      onChange={(e) => updateSetScore(i, e.target.value)}
                      className="input w-24"
                      placeholder="25-20"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                      <th className="py-2 pr-2">Player</th>
                      <th className="px-2">#</th>
                      <th className="px-2">Roster match</th>
                      {SHEET_STAT_KEYS.map((col) => (
                        <th key={col.key} className="px-2 text-center">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-navy-50">
                        <td className="py-2 pr-2">
                          <input
                            value={row.name}
                            onChange={(e) => updateRow(index, "name", e.target.value)}
                            className="input min-w-[120px]"
                            placeholder="Name"
                          />
                        </td>
                        <td className="px-2">
                          <input
                            value={row.jersey_number}
                            onChange={(e) => updateRow(index, "jersey_number", e.target.value)}
                            className="input w-16"
                            placeholder="#"
                          />
                        </td>
                        <td className="px-2">
                          <select
                            value={row.user_id ?? ""}
                            onChange={(e) =>
                              updateRow(index, "user_id", e.target.value ? Number(e.target.value) : null)
                            }
                            className="input min-w-[140px]"
                          >
                            <option value="">Not linked</option>
                            {roster.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.jersey_number != null ? ` (#${p.jersey_number})` : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        {SHEET_STAT_KEYS.map((col) => (
                          <td key={col.key} className="px-2">
                            <input
                              type={col.type === "text" ? "text" : "number"}
                              min={col.type === "text" ? undefined : "0"}
                              step={col.type === "text" ? "0.1" : "1"}
                              value={row[col.key] ?? ""}
                              onChange={(e) => updateRow(index, col.key, e.target.value)}
                              className="input w-20 text-center"
                              placeholder="—"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && <p className="mt-3 text-sm text-blue-700">{error}</p>}
            </div>

            <div className="flex gap-2 border-t border-navy-50 p-5">
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  setError("");
                }}
                className="btn-ghost flex-1"
              >
                Cancel
              </button>
              <button type="button" onClick={saveStats} disabled={saving} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save Stats"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
