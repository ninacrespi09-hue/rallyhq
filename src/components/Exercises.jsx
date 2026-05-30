"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Skills", "Strength", "Conditioning", "Recovery", "Injury Prevention"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const DIFF_STYLE = {
  Beginner: "bg-emerald-100 text-emerald-700",
  Intermediate: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
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
  const [editor, setEditor] = useState(null); // null | {} for new | exercise for edit

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((e) => e.category === filter)),
    [items, filter]
  );

  const myDone = items.filter((e) => e.mine_done).length;

  async function toggleComplete(ex) {
    const done = !ex.mine_done;
    setItems((cur) =>
      cur.map((e) =>
        e.id === ex.id
          ? { ...e, mine_done: done ? 1 : 0, completed_count: e.completed_count + (done ? 1 : -1) }
          : e
      )
    );
    await fetch(`/api/exercises/${ex.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: done }),
    });
  }

  async function remove(ex) {
    setItems((cur) => cur.filter((e) => e.id !== ex.id));
    await fetch("/api/exercises", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ex.id }),
    });
  }

  function onSaved() {
    setEditor(null);
    router.refresh();
  }

  return (
    <div>
      {/* Hero */}
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
            <button onClick={() => setEditor({})} className="btn shrink-0 bg-white text-blue-700 hover:bg-blue-50">
              + New
            </button>
          )}
        </div>
        {!isCoach && items.length > 0 && (
          <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-2.5 rounded-full bg-white transition-all"
              style={{ width: `${(myDone / items.length) * 100}%` }}
            />
          </div>
        )}
      </section>

      {/* Category filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`chip ring-1 transition ${
              filter === c
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-navy-600 ring-navy-100 hover:bg-navy-50"
            }`}
          >
            {c === "All" ? "All" : `${CAT_ICON[c]} ${c}`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {filtered.length === 0 && (
          <p className="text-sm text-navy-400">No exercises in this category yet.</p>
        )}
        {filtered.map((ex) => (
          <div key={ex.id} className="card animate-pop-in flex flex-col">
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
              <span className="chip bg-blue-50 text-blue-700">{ex.category}</span>
              {ex.reps && <span className="chip bg-navy-50 text-navy-600">🔁 {ex.reps}</span>}
            </div>

            {ex.coach_notes && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                📋 Coach note: {ex.coach_notes}
              </p>
            )}

            {/* Team progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-navy-400">
                <span>Team progress</span>
                <span>
                  {ex.completed_count}/{playerCount} done
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-700"
                  style={{ width: `${playerCount ? (ex.completed_count / playerCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              {!isCoach && (
                <button
                  onClick={() => toggleComplete(ex)}
                  className={`btn flex-1 ${
                    ex.mine_done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {ex.mine_done ? "✓ Completed" : "Mark complete"}
                </button>
              )}
              {isCoach && (
                <>
                  <button onClick={() => setEditor(ex)} className="btn-ghost flex-1">
                    Edit
                  </button>
                  <button
                    onClick={() => remove(ex)}
                    className="btn bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {editor && <ExerciseEditor exercise={editor} onClose={() => setEditor(null)} onSaved={onSaved} />}
    </div>
  );
}

function ExerciseEditor({ exercise, onClose, onSaved }) {
  const isEdit = !!exercise.id;
  const [form, setForm] = useState({
    title: exercise.title || "",
    instructions: exercise.instructions || "",
    reps: exercise.reps || "",
    difficulty: exercise.difficulty || "Beginner",
    category: exercise.category || "Skills",
    coach_notes: exercise.coach_notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError("");
    const res = await fetch("/api/exercises", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEdit ? { id: exercise.id, ...form } : form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      return setError(d.error || "Could not save.");
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 md:rounded-2xl">
        <h2 className="text-lg font-bold text-navy-900">{isEdit ? "Edit exercise" : "New exercise"}</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={set("title")} className="input" placeholder="Passing drills" />
          </div>
          <div>
            <label className="label">Instructions</label>
            <textarea value={form.instructions} onChange={set("instructions")} rows={3} className="input" placeholder="Bump a volleyball against a wall 30 times in a row…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Repetitions</label>
              <input value={form.reps} onChange={set("reps")} className="input" placeholder="30 reps / 3 sets" />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select value={form.difficulty} onChange={set("difficulty")} className="input">
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select value={form.category} onChange={set("category")} className="input">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Coach notes</label>
            <input value={form.coach_notes} onChange={set("coach_notes")} className="input" placeholder="Focus on platform angle" />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create exercise"}
          </button>
        </div>
      </div>
    </div>
  );
}
