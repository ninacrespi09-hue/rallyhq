"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { POSITIONS } from "@/lib/format";

export default function ProfileForm({ user }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isPlayer = user.role === "player";

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-lg space-y-4">
      <div>
        <label className="label">Name</label>
        <input name="name" defaultValue={user.name} className="input" required />
      </div>

      {isPlayer && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Position</label>
              <select name="position" defaultValue={user.position || ""} className="input">
                <option value="">—</option>
                {POSITIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Jersey #</label>
              <input
                name="jersey_number"
                type="number"
                min="0"
                defaultValue={user.jersey_number ?? ""}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Height (cm)</label>
            <input
              name="height_cm"
              type="number"
              min="0"
              defaultValue={user.height_cm ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea name="bio" defaultValue={user.bio ?? ""} rows={3} className="input" />
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        <button disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Saved</span>}
      </div>
    </form>
  );
}
