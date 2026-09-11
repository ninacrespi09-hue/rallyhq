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
    <div className="mt-3 rounded-md bg-blue-50/90 p-3 ring-1 ring-blue-200/80">
      <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700/70">Team invite link</div>
      <div className="mt-1 text-sm font-bold text-navy-900">{team.name}</div>
      <button
        onClick={copy}
        className="mt-2 flex w-full items-center justify-between rounded-lg bg-blue-100 px-3 py-2 transition hover:bg-blue-200/80"
      >
        <span className="truncate text-xs font-semibold text-blue-900/90">{inviteLink}</span>
        <span className="ml-2 shrink-0 text-xs text-blue-700/80">{copied ? "✓ Copied!" : "Copy"}</span>
      </button>
      <p className="mt-1.5 text-[10px] text-blue-700/60">Share this link — players join instantly</p>
    </div>
  );
}
