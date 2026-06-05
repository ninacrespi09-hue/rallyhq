"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useApiMutation } from "@/hooks/use-api";

export default function QuickDelete({ id }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  const deleteMutation = useApiMutation({ url: `/api/events/${id}`, method: "DELETE" });

  function del(e) {
    e.preventDefault();
    e.stopPropagation();
    deleteMutation.mutate(null, {
      onSuccess: () => router.refresh(),
    });
  }

  if (confirm) {
    return (
      <div className="flex shrink-0 gap-1.5" onClick={(e) => e.preventDefault()}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirm(false)}
          className="chip h-auto rounded-full bg-white px-2.5 py-0.5 text-xs text-navy-500 ring-1 ring-navy-200"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={del}
          disabled={deleteMutation.isPending}
          className="chip h-auto rounded-full bg-blue-700 px-2.5 py-0.5 text-xs text-white"
        >
          {deleteMutation.isPending ? "…" : "Delete"}
        </Button>
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
