"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATS } from "@/lib/statDefs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApiMutation } from "@/hooks/use-api";

export default function CoachSeasonStats({ playerId, playerName, totals, stats = STATS }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(() => {
    const v = {};
    stats.forEach((s) => (v[s.key] = totals[s.key] ?? 0));
    return v;
  });
  const [error, setError] = useState("");

  const saveMutation = useApiMutation({
    url: `/api/players/${playerId}/stats`,
    method: "POST",
  });

  function openEditor() {
    const v = {};
    stats.forEach((s) => (v[s.key] = totals[s.key] ?? 0));
    setVals(v);
    setError("");
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      await saveMutation.mutateAsync(vals);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message || "Could not save season statistics.");
    }
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-navy-900">Season Statistics</h2>
        <Button variant="link" size="sm" onClick={openEditor} className="h-auto p-0 text-xs font-semibold text-brand-600">
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.key} className="border-0 bg-navy-50 shadow-none">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-extrabold text-navy-900">{totals[s.key]}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>{playerName}</DialogTitle>
              <DialogDescription>Update season totals</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {stats.map((s) => (
                <div key={s.key}>
                  <Label>{s.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={vals[s.key]}
                    onChange={(e) => setVals((v) => ({ ...v, [s.key]: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-blue-700">{error}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
                {saveMutation.isPending ? "Saving…" : "Save season stats"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
