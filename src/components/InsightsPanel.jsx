"use client";

import { useState } from "react";
import { SEVERITY_STYLES } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <Button onClick={generate} disabled={loading}>
        {loading ? "Analyzing check-ins…" : data ? "Re-run analysis" : "Generate insights"}
      </Button>

      {error && <p className="text-sm text-blue-600">{error}</p>}

      {!data && !loading && (
        <Card>
          <CardContent className="text-sm text-navy-400">
            No analysis yet. Tap <b className="text-navy-600">Generate insights</b> to analyze recent check-ins.
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card className="border-l-4 border-brand-500">
            <CardContent>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-navy-900">Summary</h2>
                <Badge
                  className={
                    data.source === "claude" ? "bg-violet-100 text-violet-700" : "bg-navy-50 text-navy-500"
                  }
                >
                  {data.source === "claude" ? "✦ Claude" : "rule-based"}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-navy-700">{data.summary}</p>
            </CardContent>
          </Card>

          {data.flags?.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-400">
                Flags ({data.flags.length})
              </h2>
              {data.flags.map((f, i) => (
                <Card key={i}>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge className={`capitalize ${SEVERITY_STYLES[f.severity] || SEVERITY_STYLES.low}`}>
                        {f.severity}
                      </Badge>
                      <span className="font-semibold text-navy-800">{f.title}</span>
                      {f.player && scope === "team" && (
                        <span className="ml-auto text-xs font-medium text-navy-400">{f.player}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-navy-600">{f.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-sm text-emerald-700">✓ No concerns flagged. Everyone looks good!</CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
