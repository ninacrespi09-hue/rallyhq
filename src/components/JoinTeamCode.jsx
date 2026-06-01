"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <label className="label">Enter team code</label>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          className="input"
          placeholder="e.g. WOLVES2025"
          style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
        />
      </div>
      {error && (
        <div className="mt-2 rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-900">{error}</div>
      )}
      <button type="submit" className="btn-primary mt-3 w-full">
        {isParent ? "Join as parent" : "Join team"}
      </button>
    </form>
  );
}
