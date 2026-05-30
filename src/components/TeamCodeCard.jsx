"use client";

import { useEffect, useState } from "react";

export default function TeamCodeCard() {
  const [team, setTeam] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/team/code").then((r) => r.ok ? r.json() : null).then(setTeam);
  }, []);

  if (!team) return null;

  const inviteLink = `${window.location.origin}/join/${team.code}`;

  function copy() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="mt-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
      <div className="text-[10px] font-bold uppercase tracking-wide text-blue-200/70">Team invite link</div>
      <div className="mt-1 text-sm font-bold text-blue-100">{team.name}</div>
      <button
        onClick={copy}
        className="mt-2 flex w-full items-center justify-between rounded-lg bg-white/15 px-3 py-2 transition hover:bg-white/25"
      >
        <span className="truncate text-xs font-semibold text-white/90">{inviteLink}</span>
        <span className="ml-2 shrink-0 text-xs text-white/70">{copied ? "✓ Copied!" : "Copy"}</span>
      </button>
      <p className="mt-1.5 text-[10px] text-blue-200/60">Share this link — players join instantly</p>
    </div>
  );
}
