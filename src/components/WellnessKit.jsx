"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useApiMutation } from "@/hooks/use-api";
import { isCoach, isPlayer } from "@/lib/permissions";

const QUICK_SUGGESTIONS = [
  "Athletic tape",
  "Stretch bands",
  "Ice packs",
  "Foam roller",
  "Electrolyte packets",
  "Compression socks",
  "Cooling towels",
  "Massage gun",
  "Heat packs",
  "Grip tape",
];

function fmtWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function WellnessKit({ user, initialSuggestions, initialItems }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [items, setItems] = useState(initialItems);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [itemError, setItemError] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState("");

  const suggestionMutation = useApiMutation({ url: "/api/wellness-kit" });
  const addItemMutation = useApiMutation({ url: "/api/wellness-kit/items" });
  const editItemMutation = useApiMutation({ url: "/api/wellness-kit/items", method: "PATCH" });
  const deleteItemMutation = useApiMutation({ url: "/api/wellness-kit/items", method: "DELETE" });

  function submitSuggestion(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || suggestionMutation.isPending) return;
    setError("");

    suggestionMutation.mutate(
      { suggestion: text },
      {
        onSuccess: (data) => {
          setSuggestions((cur) => [
            {
              id: data.id,
              suggestion: data.suggestion,
              created_at: data.created_at,
              user_id: data.user_id,
              author_name: data.author_name,
            },
            ...cur,
          ]);
          setInput("");
          router.refresh();
        },
        onError: (err) => setError(err.message || "Could not save your suggestion."),
      }
    );
  }

  function addItem(e) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name || addItemMutation.isPending) return;
    setItemError("");

    addItemMutation.mutate(
      { item_name: name, quantity: newItemQty.trim() || null },
      {
        onSuccess: (data) => {
          setItems((cur) => [
            ...cur,
            {
              id: data.id,
              item_name: data.item_name,
              quantity: data.quantity,
              sort_order: data.sort_order,
            },
          ]);
          setNewItemName("");
          setNewItemQty("");
          router.refresh();
        },
        onError: (err) => setItemError(err.message || "Could not add item."),
      }
    );
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.item_name);
    setEditQty(item.quantity || "");
    setItemError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditQty("");
  }

  function saveEdit(itemId) {
    const name = editName.trim();
    if (!name || editItemMutation.isPending) return;
    setItemError("");

    editItemMutation.mutate(
      { id: itemId, item_name: name, quantity: editQty.trim() || null },
      {
        onSuccess: (data) => {
          setItems((cur) =>
            cur.map((item) =>
              item.id === itemId
                ? { ...item, item_name: data.item_name, quantity: data.quantity }
                : item
            )
          );
          cancelEdit();
          router.refresh();
        },
        onError: (err) => setItemError(err.message || "Could not update item."),
      }
    );
  }

  function removeItem(itemId) {
    if (deleteItemMutation.isPending) return;
    setItemError("");

    deleteItemMutation.mutate(
      { id: itemId },
      {
        onSuccess: () => {
          setItems((cur) => cur.filter((item) => item.id !== itemId));
          if (editingId === itemId) cancelEdit();
          router.refresh();
        },
        onError: (err) => setItemError(err.message || "Could not remove item."),
      }
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <CardContent className="p-5">
          <h2 className="mb-1 font-bold text-navy-900">What&apos;s in the kit</h2>
          <p className="mb-4 text-sm text-navy-500">
            {isCoach(user)
              ? "Keep this list up to date so players know what the team already has."
              : "Items your coach has packed for the team."}
          </p>

          {isCoach(user) && (
            <form onSubmit={addItem} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name, e.g. Foam roller"
                maxLength={120}
                className="rounded-2xl bg-white"
              />
              <Input
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="Qty (optional)"
                maxLength={40}
                className="rounded-2xl bg-white sm:max-w-[140px]"
              />
              <Button type="submit" disabled={!newItemName.trim() || addItemMutation.isPending} className="shrink-0 rounded-2xl">
                {addItemMutation.isPending ? "Adding…" : "Add item"}
              </Button>
            </form>
          )}

          {items.length === 0 ? (
            <div className="rounded-2xl bg-white/80 px-4 py-6 text-center ring-1 ring-emerald-100">
              <span className="text-3xl">📦</span>
              <p className="mt-2 text-sm text-navy-500">
                {isCoach(user) ? "No items yet — add what's in your wellness kit." : "Your coach hasn't listed kit items yet."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-emerald-100 sm:flex-row sm:items-center sm:justify-between"
                >
                  {editingId === item.id ? (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={120}
                          className="rounded-xl"
                        />
                        <Input
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          placeholder="Qty"
                          maxLength={40}
                          className="rounded-xl sm:max-w-[120px]"
                        />
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => saveEdit(item.id)} disabled={editItemMutation.isPending}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="font-medium text-navy-800">{item.item_name}</p>
                        {item.quantity && <p className="text-sm text-navy-500">Qty: {item.quantity}</p>}
                      </div>
                      {isCoach(user) && (
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => removeItem(item.id)}
                            disabled={deleteItemMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {itemError && <p className="mt-2 text-sm text-red-600">{itemError}</p>}
        </CardContent>
      </Card>

      {isPlayer(user) && (
        <Card className="overflow-hidden border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50">
          <CardContent className="p-5">
            <form onSubmit={submitSuggestion} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="wellness-kit-suggestion" className="mb-2 block text-sm font-semibold text-navy-800">
                  What would you like in your wellness kit?
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute -left-1 -top-1 h-4 w-4 rounded-bl-xl bg-sky-200/80" />
                  <textarea
                    id="wellness-kit-suggestion"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    maxLength={200}
                    placeholder="e.g. resistance bands, electrolyte packets, ice packs…"
                    className="w-full resize-none rounded-3xl rounded-bl-md border border-sky-200 bg-white px-4 py-3 text-sm text-navy-800 shadow-sm outline-none ring-sky-300 transition placeholder:text-navy-400 focus:ring-2"
                  />
                </div>
                <p className="mt-1 text-xs text-navy-400">{input.length}/200</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_SUGGESTIONS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setInput((cur) => (cur ? `${cur}, ${chip.toLowerCase()}` : chip))}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-navy-600 ring-1 ring-sky-200 transition hover:bg-sky-50"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={!input.trim() || suggestionMutation.isPending} className="shrink-0 rounded-2xl">
                {suggestionMutation.isPending ? "Adding…" : "Add suggestion"}
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      {isCoach(user) && (
        <Card className="border-sky-200/60 bg-sky-50/60">
          <CardContent className="p-4 text-sm text-navy-600">
            Player suggestions are below — use them when you update the kit list above.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 font-bold text-navy-900">Team suggestions</h2>
          {suggestions.length === 0 ? (
            <div className="rounded-2xl bg-navy-50 px-4 py-8 text-center">
              <span className="text-3xl">🎒</span>
              <p className="mt-2 text-sm text-navy-500">
                {isPlayer(user)
                  ? "No suggestions yet — be the first to add one!"
                  : "No player suggestions yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => {
                const mine = s.user_id === user.id;
                return (
                  <div key={s.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-gradient-to-br from-sky-500 to-cyan-600 text-white"
                          : "rounded-bl-md bg-white ring-1 ring-sky-100"
                      }`}
                    >
                      <p className={`text-sm leading-relaxed ${mine ? "text-white" : "text-navy-800"}`}>
                        {s.suggestion}
                      </p>
                      <div
                        className={`mt-1.5 flex items-center gap-2 text-[11px] ${
                          mine ? "text-sky-100" : "text-navy-400"
                        }`}
                      >
                        <span className="font-semibold">{mine ? "You" : s.author_name}</span>
                        <span>·</span>
                        <span>{fmtWhen(s.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
