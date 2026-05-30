"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuickDelete({ id }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function del(e) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex shrink-0 gap-1.5" onClick={(e) => e.preventDefault()}>
        <button onClick={() => setConfirm(false)} className="chip bg-white text-navy-500 ring-1 ring-navy-200">
          Cancel
        </button>
        <button onClick={del} disabled={deleting} className="chip bg-blue-700 text-white">
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirm(true); }}
      className="shrink-0 text-navy-300 hover:text-blue-700 transition text-lg"
      title="Delete event"
    >
      🗑
    </button>
  );
}
