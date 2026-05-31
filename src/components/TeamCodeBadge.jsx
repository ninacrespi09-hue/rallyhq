"use client";

import { useState } from "react";

export default function TeamCodeBadge({ code, teamName, isCoach }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  function copy() {
    const text = isCoach ? `${window.location.origin}/join/${code}` : code;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
      <button
        type="button"
        onClick={copy}
        title={isCoach ? "Copy invite link" : "Copy team code"}
        className="rounded-xl bg-white/85 px-3 py-2 text-right shadow-soft ring-1 ring-blue-200/80 backdrop-blur transition hover:bg-white"
      >
        <div className="text-[10px] font-bold uppercase tracking-wide text-navy-400">Team code</div>
        <div className="font-mono text-sm font-extrabold tracking-wider text-brand-700">{code}</div>
        {teamName && <div className="mt-0.5 max-w-[140px] truncate text-[10px] text-navy-500">{teamName}</div>}
        <div className="mt-1 text-[10px] font-semibold text-blue-600">
          {copied ? "✓ Copied!" : isCoach ? "Tap to copy invite link" : "Tap to copy"}
        </div>
      </button>
    </div>
  );
}
