"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, useApiMutation } from "@/hooks/use-api";

const CATEGORIES = ["Skills", "Strength", "Conditioning", "Recovery", "Injury Prevention"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const DIFF_STYLE = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-blue-100 text-blue-700",
  Advanced: "bg-blue-100 text-blue-700",
};
const CAT_ICON = {
  Skills: "🏐",
  Strength: "💪",
  Conditioning: "🏃",
  Recovery: "🧘",
  "Injury Prevention": "🛡️",
};

export default function Exercises({ user, initialExercises, playerCount }) {
  const router = useRouter();
  const isCoach = user.role === "coach";
  const [items, setItems] = useState(initialExercises);
  const [filter, setFilter] = useState("All");
  const [editor, setEditor] = useState(null);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((e) => e.category === filter)),
    [items, filter]
  );

  const myDone = items.filter((e) => e.mine_done).length;

  const completeMutation = useMutation({
    mutationFn: ({ id, completed }) =>
      apiFetch(`/api/exercises/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ completed }),
      }),
  });

  const deleteMutation = useApiMutation({
    url: "/api/exercises",
    method: "DELETE",
  });

  async function toggleComplete(ex) {
    const done = !ex.mine_done;
    setItems((cur) =>
      cur.map((e) =>
        e.id === ex.id
          ? { ...e, mine_done: done ? 1 : 0, completed_count: e.completed_count + (done ? 1 : -1) }
          : e
      )
    );
    try {
      await completeMutation.mutateAsync({ id: ex.id, completed: done });
    } catch {
      setItems((cur) =>
        cur.map((e) =>
          e.id === ex.id
            ? { ...e, mine_done: ex.mine_done, completed_count: ex.completed_count }
            : e
        )
      );
    }
  }

  async function remove(ex) {
    const prev = items;
    setItems((cur) => cur.filter((e) => e.id !== ex.id));
    try {
      await deleteMutation.mutateAsync({ id: ex.id });
    } catch {
      setItems(prev);
    }
  }

  function onSaved() {
    setEditor(null);
    router.refresh();
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-navy-900 p-6 text-white shadow-soft">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-blue-100">💪 Recommended Exercises</div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Train Smarter</h1>
            {!isCoach && (
              <p className="mt-1 text-sm text-blue-100">
                You've completed <b className="text-white">{myDone}</b> of {items.length} exercises.
              </p>
            )}
            {isCoach && (
              <p className="mt-1 text-sm text-blue-100">{items.length} exercises assigned to the team.</p>
            )}
          </div>
          {isCoach && (
            <Button onClick={() => setEditor({})} className="shrink-0 bg-white text-blue-700 hover:bg-blue-50">
              + New
            </Button>
          )}
        </div>
        {!isCoach && items.length > 0 && (
          <Progress
            value={(myDone / items.length) * 100}
            className="relative mt-4 h-2.5 bg-white/20"
          />
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? "default" : "outline"}
            onClick={() => setFilter(c)}
            className="rounded-full"
          >
            {c === "All" ? "All" : `${CAT_ICON[c]} ${c}`}
          </Button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-navy-400">No exercises in this category yet.</p>
        )}
        {filtered.map((ex) => (
          <Card key={ex.id} className="animate-pop-in flex flex-col">
            <CardContent className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CAT_ICON[ex.category] || "🏐"}</span>
                  <h3 className="font-bold text-navy-900">{ex.title}</h3>
                </div>
                <span className={`chip ${DIFF_STYLE[ex.difficulty] || DIFF_STYLE.Beginner}`}>
                  {ex.difficulty}
                </span>
              </div>

              {ex.instructions && <p className="mt-2 text-sm text-navy-600">{ex.instructions}</p>}

              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <Badge className="bg-blue-50 text-blue-700">{ex.category}</Badge>
                {ex.reps && <Badge variant="secondary">🔁 {ex.reps}</Badge>}
              </div>

              {ex.coach_notes && (
                <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800">
                  📋 Coach note: {ex.coach_notes}
                </p>
              )}

              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-navy-400">
                  <span>Team progress</span>
                  <span>
                    {ex.completed_count}/{playerCount} done
                  </span>
                </div>
                <Progress
                  value={playerCount ? (ex.completed_count / playerCount) * 100 : 0}
                  className="mt-1 h-1.5"
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                {!isCoach && (
                  <Button
                    onClick={() => toggleComplete(ex)}
                    className={`flex-1 ${
                      ex.mine_done
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : ""
                    }`}
                    variant={ex.mine_done ? "secondary" : "default"}
                  >
                    {ex.mine_done ? "✓ Completed" : "Mark complete"}
                  </Button>
                )}
                {isCoach && (
                  <>
                    <Button variant="ghost" onClick={() => setEditor(ex)} className="flex-1">
                      Edit
                    </Button>
                    <Button variant="soft" onClick={() => remove(ex)}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editor && (
        <ExerciseEditor
          exercise={editor}
          open
          onOpenChange={(open) => !open && setEditor(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function ExerciseEditor({ exercise, open, onOpenChange, onSaved }) {
  const isEdit = !!exercise?.id;
  const [form, setForm] = useState({
    title: exercise?.title || "",
    instructions: exercise?.instructions || "",
    reps: exercise?.reps || "",
    difficulty: exercise?.difficulty || "Beginner",
    category: exercise?.category || "Skills",
    coach_notes: exercise?.coach_notes || "",
  });
  const [error, setError] = useState("");

  const saveMutation = useApiMutation({
    url: "/api/exercises",
    method: isEdit ? "PATCH" : "POST",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.title.trim()) return setError("Title is required.");
    setError("");
    try {
      await saveMutation.mutateAsync(isEdit ? { id: exercise.id, ...form } : form);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit exercise" : "New exercise"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={set("title")} className="mt-1.5" placeholder="Passing drills" />
          </div>
          <div>
            <Label>Instructions</Label>
            <Textarea
              value={form.instructions}
              onChange={set("instructions")}
              rows={3}
              className="mt-1.5"
              placeholder="Bump a volleyball against a wall 30 times in a row…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Repetitions</Label>
              <Input value={form.reps} onChange={set("reps")} className="mt-1.5" placeholder="30 reps / 3 sets" />
            </div>
            <div>
              <Label>Difficulty</Label>
              <select
                value={form.difficulty}
                onChange={set("difficulty")}
                className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <select
              value={form.category}
              onChange={set("category")}
              className="mt-1.5 flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm shadow-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Coach notes</Label>
            <Input
              value={form.coach_notes}
              onChange={set("coach_notes")}
              className="mt-1.5"
              placeholder="Focus on platform angle"
            />
          </div>
        </div>
        {error && <p className="text-sm text-blue-600">{error}</p>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={save} disabled={saveMutation.isPending} className="flex-1">
            {saveMutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
