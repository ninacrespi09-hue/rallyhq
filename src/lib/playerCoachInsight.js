import { getDb } from "./db";
import { analyzePlayerCoach } from "./ai";
import { buildPlayerCoachProfile } from "./playerCoachData";

const SCOPE = "player_coach";

export function parsePlayerCoachInsight(row) {
  if (!row) return null;
  let details = {};
  try {
    details = JSON.parse(row.details_json || "{}");
  } catch {
    details = {};
  }
  return {
    summary: row.summary,
    strengths: details.strengths || [],
    weaknesses: details.weaknesses || [],
    habitImpact: details.habitImpact || "",
    improvements: details.improvements || [],
    source: row.source,
    generated_at: row.generated_at,
  };
}

export function getLatestPlayerCoachInsight(userId) {
  const row = getDb()
    .prepare(
      `SELECT * FROM ai_insights WHERE scope = ? AND user_id = ?
       ORDER BY generated_at DESC LIMIT 1`
    )
    .get(SCOPE, userId);
  return parsePlayerCoachInsight(row);
}

function savePlayerCoachInsight(userId, result) {
  getDb()
    .prepare(
      `INSERT INTO ai_insights (scope, user_id, summary, details_json, source)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      SCOPE,
      userId,
      result.summary,
      JSON.stringify({
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        habitImpact: result.habitImpact,
        improvements: result.improvements,
      }),
      result.source
    );
}

/** Rebuild AI coach insight from current stats, wellness, and habits. */
export async function regeneratePlayerCoachInsight(playerId, teamId) {
  const profile = buildPlayerCoachProfile(playerId, teamId);
  if (!profile) return null;
  const result = await analyzePlayerCoach(profile);
  savePlayerCoachInsight(playerId, result);
  return result;
}

/** Profile sections driven by AI when available, else stat heuristics. */
export function profileInsightsFromAi(aiInsight, fallback) {
  if (!aiInsight) return fallback;
  return {
    strengths: aiInsight.strengths.length ? aiInsight.strengths : fallback.strengths,
    improvements: aiInsight.weaknesses.length ? aiInsight.weaknesses : fallback.improvements,
    habitImpact: aiInsight.habitImpact || "",
  };
}

/** AI wellness/injury context tied to current stats (does not alter check-in rows). */
export function wellnessNotesFromAi(aiInsight, wellness, injuries) {
  const wellnessNotes = [];
  if (aiInsight?.habitImpact) wellnessNotes.push(aiInsight.habitImpact);
  if (wellness != null && wellness < 60) {
    wellnessNotes.push(`Wellness score ${wellness}/100 — recovery may be affecting stat output.`);
  }
  const injuryNote =
    injuries.length > 0
      ? `${injuries.length} injury report(s) on file — stats may reflect limited reps or recovery time.`
      : "";
  return { wellnessNotes, injuryNote };
}
