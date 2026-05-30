import Anthropic from "@anthropic-ai/sdk";

/**
 * Analyze a set of player check-ins and surface trends.
 * Uses Claude when ANTHROPIC_API_KEY is configured, otherwise falls back
 * to a deterministic rule-based engine so the demo always works offline.
 *
 * @param {Object} input
 * @param {string} input.scope - 'team' | 'player'
 * @param {Array}  input.checkins - rows: { name, date, soreness, energy, mood, injury, sore_areas, note }
 * @returns {Promise<{summary:string, flags:Array, source:string}>}
 */
export async function analyzeCheckins({ scope, checkins }) {
  if (!checkins || checkins.length === 0) {
    return {
      summary: "Not enough check-in data yet. Encourage players to check in daily.",
      flags: [],
      source: "rules",
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await analyzeWithClaude({ scope, checkins });
    } catch (err) {
      console.error("Claude analysis failed, falling back to rules:", err.message);
    }
  }
  return analyzeWithRules({ scope, checkins });
}

async function analyzeWithClaude({ scope, checkins }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const dataset = checkins
    .map(
      (c) =>
        `${c.date} | ${c.name} | soreness=${c.soreness}/5 energy=${c.energy}/5 mood=${c.mood}/5 injury=${
          c.injury ? "YES" : "no"
        }${c.sore_areas ? ` areas=${c.sore_areas}` : ""}${c.note ? ` note="${c.note}"` : ""}`
    )
    .join("\n");

  const system =
    "You are an assistant coach and athletic-trainer aide for a volleyball team. " +
    "Analyze daily player check-ins (soreness 1=none..5=severe, energy 1=drained..5=great, mood 1=low..5=great). " +
    "Identify meaningful trends, injury risks, and players who may need attention or rest. " +
    "Be concise, specific, and actionable. Respond ONLY with valid JSON.";

  const prompt =
    `Scope: ${scope}\n\nCheck-in log (most recent first):\n${dataset}\n\n` +
    `Return JSON exactly in this shape:\n` +
    `{"summary":"2-3 sentence overview for the coach","flags":[{"player":"name or Team","severity":"high|medium|low","title":"short","detail":"what you noticed and what to do"}]}`;

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content.find((b) => b.type === "text")?.text || "{}";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return {
    summary: json.summary || "Analysis complete.",
    flags: Array.isArray(json.flags) ? json.flags : [],
    source: "claude",
  };
}

/* ----------------------------- Rule-based engine ----------------------------- */

function analyzeWithRules({ scope, checkins }) {
  // Group by player
  const byPlayer = new Map();
  for (const c of checkins) {
    if (!byPlayer.has(c.name)) byPlayer.set(c.name, []);
    byPlayer.get(c.name).push(c);
  }

  const flags = [];
  for (const [name, rows] of byPlayer) {
    // rows come in most-recent-first; sort ascending by date for trend math
    const series = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const recent = series.slice(-4); // last up-to-4 check-ins

    // Active injury flag
    const injured = recent.find((r) => r.injury);
    if (injured) {
      flags.push({
        player: name,
        severity: "high",
        title: "Injury reported",
        detail: `${name} flagged an injury on ${injured.date}${
          injured.sore_areas ? ` (${injured.sore_areas})` : ""
        }. Follow up before next session.`,
      });
    }

    // Rising soreness trend
    if (recent.length >= 3 && isRising(recent.map((r) => r.soreness))) {
      const last = recent[recent.length - 1];
      flags.push({
        player: name,
        severity: last.soreness >= 4 ? "high" : "medium",
        title: "Soreness trending up",
        detail: `${name}'s soreness has climbed over the last ${recent.length} check-ins (now ${last.soreness}/5). Consider load management or recovery work.`,
      });
    }

    // Low energy streak
    const lowEnergy = recent.filter((r) => r.energy <= 2).length;
    if (lowEnergy >= 2) {
      flags.push({
        player: name,
        severity: "medium",
        title: "Low energy streak",
        detail: `${name} reported low energy ${lowEnergy} of the last ${recent.length} days. Check sleep/nutrition and recovery.`,
      });
    }

    // Mood dip
    const last = recent[recent.length - 1];
    if (last && last.mood <= 2) {
      flags.push({
        player: name,
        severity: "low",
        title: "Mood dip",
        detail: `${name}'s most recent mood was ${last.mood}/5. A quick personal check-in may help.`,
      });
    }
  }

  // Team-level aggregate
  const avg = (key) =>
    (checkins.reduce((s, c) => s + c[key], 0) / checkins.length).toFixed(1);
  const injuries = checkins.filter((c) => c.injury).length;

  flags.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const summary =
    scope === "team"
      ? `Across ${byPlayer.size} player(s) and ${checkins.length} check-ins: avg soreness ${avg(
          "soreness"
        )}/5, energy ${avg("energy")}/5, mood ${avg("mood")}/5. ${
          injuries ? `${injuries} injury report(s) on file. ` : "No active injuries. "
        }${flags.length ? `${flags.length} item(s) need attention.` : "Team looks healthy."}`
      : `Recent averages — soreness ${avg("soreness")}/5, energy ${avg("energy")}/5, mood ${avg(
          "mood"
        )}/5. ${flags.length ? "See flags below." : "Trending well, keep it up!"}`;

  return { summary, flags, source: "rules" };
}

function isRising(arr) {
  let rises = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] >= arr[i - 1]) rises++;
  return arr[arr.length - 1] > arr[0] && rises >= arr.length - 1;
}

function severityRank(s) {
  return { high: 3, medium: 2, low: 1 }[s] || 0;
}
