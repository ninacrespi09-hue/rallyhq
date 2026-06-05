"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinTeamCode({ joinRole = "player" }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const isParent = joinRole === "parent";

  function onJoin(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter your team code.");
      return;
    }
    setError("");
    const roleQuery = isParent ? "?role=parent" : "";
    router.push(`/join/${encodeURIComponent(trimmed.toUpperCase())}${roleQuery}`);
  }

  return (
    <form onSubmit={onJoin} className="rounded-xl bg-white/50 p-4 ring-1 ring-blue-200/60 text-left">
      <div className="text-sm font-bold text-navy-900">
        {isParent ? "👨‍👩‍👧 I'm a parent" : "🏐 I'm a player"}
      </div>
      <p className="mt-1 text-xs text-navy-500">
        {isParent
          ? "Enter your team invite code to follow schedule, announcements, and photos."
          : "Enter your team code from your coach, or use their invite link."}
      </p>
      <div className="mt-3">
        <Label>Enter team code</Label>
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          placeholder="e.g. WOLVES2025"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        />
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">{error}</div>
      )}
      <Button type="submit" className="mt-3 w-full">
        {isParent ? "Join as parent" : "Join team"}
      </Button>
    </form>
  );
}
