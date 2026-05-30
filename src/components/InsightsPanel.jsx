"use client";

import { useState } from "react";
import { SEVERITY_STYLES } from "@/lib/format";

export default function InsightsPanel({ initial, scope }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/insights", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setError(json.error || "Could not generate insights.");
    setData({ ...json, generated_at: new Date().toISOString() });
  }

  return (
    <div className="space-y-4">
      <button onClick={generate} disabled={loading} className="btn-primary">
        {loading ? "Analyzing check-ins…" : data ? "Re-run analysis" : "Generate insights"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!data && !loading && (
        <div className="card text-sm text-slate-400">
          No analysis yet. Tap <b className="text-slate-600">Generate insights</b> to analyze recent check-ins.
        </div>
      )}

      {data && (
        <>
          <div className="card border-l-4 border-brand-500">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900">Summary</h2>
              <span
                className={`chip ${
                  data.source === "claude" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {data.source === "claude" ? "✦ Claude" : "rule-based"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{data.summary}</p>
          </div>

          {data.flags?.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Flags ({data.flags.length})
              </h2>
              {data.flags.map((f, i) => (
                <div key={i} className="card">
                  <div className="flex items-center gap-2">
                    <span className={`chip capitalize ${SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.low}`}>
                      {f.severity}
                    </span>
                    <span className="font-semibold text-slate-800">{f.title}</span>
                    {f.player && scope === "team" && (
                      <span className="ml-auto text-xs font-medium text-slate-400">{f.player}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{f.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-sm text-emerald-700">✓ No concerns flagged. Everyone looks good!</div>
          )}
        </>
      )}
    </div>
  );
}
