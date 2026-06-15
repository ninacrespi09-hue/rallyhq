import Anthropic from "@anthropic-ai/sdk";
import { enrichImprovementsWithExercises } from "./weaknessExercises";
import { answerAppQuestionRules, formatAppContextForPrompt } from "./aiAppContext";

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

/* ----------------------------- AI Coach (full player profile) ----------------------------- */

/**
 * Personalized coach bot: strengths, weaknesses, habits, improvements from all app data.
 * @param {Object} profile - from buildPlayerCoachProfile()
 */
export async function analyzePlayerCoach(profile) {
  if (!profile) {
    return emptyCoachInsight("No player data found.");
  }

  let result;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      result = await analyzePlayerCoachClaude(profile);
    } catch (err) {
      console.error("Claude player coach failed, falling back to rules:", err.message);
      result = analyzePlayerCoachRules(profile);
    }
  } else {
    result = analyzePlayerCoachRules(profile);
  }

  return enrichImprovementsWithExercises(result, profile);
}

function emptyCoachInsight(summary) {
  return {
    summary,
    strengths: [],
    weaknesses: [],
    habitImpact: "",
    improvements: [],
    source: "rules",
  };
}

async function analyzePlayerCoachClaude(profile) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system =
    "You are an expert volleyball coach AI assistant. Analyze the player's full profile: " +
    "game stats, wellness check-ins, exercise habits, and attendance. " +
    "Be encouraging but honest. Tie wellness habits directly to on-court performance. " +
    "Respond ONLY with valid JSON.";

  const exerciseList = (profile.teamExercises || [])
    .map((e) => `${e.title} (${e.reps}, ${e.category})`)
    .join("; ");

  const prompt =
    `Player: ${profile.name} (${profile.position || "Player"})\n\n` +
    `Profile data:\n${JSON.stringify(profile, null, 2)}\n\n` +
    (exerciseList ? `Team exercises available: ${exerciseList}\n\n` : "") +
    `Return JSON exactly:\n` +
    `{"summary":"2-3 sentence overview","strengths":["..."],"weaknesses":["..."],` +
    `"habitImpact":"1-2 sentences on how daily habits affect their game",` +
    `"improvements":["specific actionable tips — do NOT list exercises here; exercises are added separately"]}`;

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content.find((b) => b.type === "text")?.text || "{}";
  const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return {
    summary: json.summary || "Analysis complete.",
    strengths: arr(json.strengths),
    weaknesses: arr(json.weaknesses),
    habitImpact: json.habitImpact || "",
    improvements: arr(json.improvements),
    source: "claude",
  };
}

function analyzePlayerCoachRules(profile) {
  const strengths = [...profile.computedStrengths];
  const weaknesses = [...profile.computedImprovements];
  const improvements = [];

  if (profile.gamesPlayed === 0) {
    return {
      summary: `${profile.name} is building their profile. Log game stats and check in daily so the AI can learn their game.`,
      strengths: ["Ready to grow — every rep counts."],
      weaknesses: ["Limited game data so far."],
      habitImpact:
        "Daily wellness check-ins will help the coach spot fatigue before it hurts performance in matches.",
      improvements: [
        "Complete your daily wellness check-in.",
        "Finish recommended exercises from the coach.",
        "After each game, stats will unlock deeper insights.",
      ],
      source: "rules",
    };
  }

  let habitImpact = "";
  const checkins = profile.recentCheckins || [];
  if (checkins.length === 0) {
    habitImpact =
      "Without regular check-ins, it's harder to connect energy and soreness to performance dips in games.";
    improvements.push("Check in daily so the AI can link your wellness to your stats.");
  } else {
    const avgEnergy = checkins.reduce((s, c) => s + c.energy, 0) / checkins.length;
    const avgSoreness = checkins.reduce((s, c) => s + c.soreness, 0) / checkins.length;
    if (avgEnergy <= 2.5) {
      habitImpact =
        "Low energy scores lately often show up as slower reactions and fewer successful digs in games.";
      improvements.push("Prioritize sleep and recovery on low-energy days.");
      weaknesses.push("Energy has been low in recent check-ins.");
    } else if (avgSoreness >= 3.5) {
      habitImpact =
        "Higher soreness can limit jump height and attack power — watch for error spikes after tough weeks.";
      improvements.push("Use recovery exercises and ice sore areas before practice.");
      weaknesses.push("Soreness trending higher than ideal.");
    } else {
      habitImpact =
        "Solid wellness habits — your energy and soreness levels support consistent performance in matches.";
    }
  }

  if (profile.attendancePct != null && profile.attendancePct < 75) {
    weaknesses.push(`Attendance at ${profile.attendancePct}% — missing reps limits stat growth.`);
    improvements.push("Aim for more consistent practice attendance to sharpen skills.");
  } else if (profile.attendancePct != null && profile.attendancePct >= 90) {
    strengths.push("Excellent practice attendance.");
  }

  if (profile.exercisesAvailable > 0) {
    const pct = Math.round((profile.exercisesCompleted / profile.exercisesAvailable) * 100);
    if (pct < 40) {
      improvements.push(`Only ${pct}% of recommended exercises completed — extra work accelerates improvement.`);
    } else if (pct >= 70) {
      strengths.push("Strong follow-through on recommended exercises.");
    }
  }

  if (profile.wellnessScore != null && profile.wellnessScore < 60) {
    weaknesses.push(`Wellness score ${profile.wellnessScore}/100 — recovery may be affecting output.`);
  }

  const topStat = Object.entries(profile.perGameStats || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  )[0];
  if (topStat && Number(topStat[1]) > 0) {
    strengths.push(`Strong ${topStat[0]} production (${topStat[1]} per game).`);
  }

  if (improvements.length === 0) {
    improvements.push("Keep logging stats and checking in daily to refine this plan.");
  }

  const summary = `${profile.name} has ${profile.gamesPlayed} game(s) logged. ${
    strengths.length ? "Leading with " + strengths[0].toLowerCase().replace(/\.$/, "") + "." : ""
  } ${weaknesses.length ? "Focus area: " + weaknesses[0].toLowerCase().replace(/\.$/, "") + "." : "Trending well overall."}`;

  return {
    summary,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    habitImpact,
    improvements: improvements.slice(0, 5),
    source: "rules",
  };
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

/**
 * Answer a player's or coach's question using profile, app context, and chat history.
 */
export async function answerPlayerVolleyballQuestion({ profile, message, history = [], appContext, role = "player" }) {
  const q = (message || "").trim();
  if (!q) {
    return {
      reply:
        role === "coach"
          ? "Ask me about the schedule, roster, announcements, exercises, or team stats."
          : "Ask me about the schedule, announcements, your stats, exercises, or how to improve your game.",
      source: "rules",
    };
  }

  const appAnswer = answerAppQuestionRules({ message: q, appContext, profile });
  if (appAnswer) return appAnswer;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await answerVolleyballChatClaude({ profile, message: q, history, appContext, role });
    } catch (err) {
      console.error("Claude chat failed, falling back to rules:", err.message);
    }
  }
  return answerSportChatRules({ profile, message: q, appContext, role });
}

async function answerVolleyballChatClaude({ profile, message, history, appContext, role = "player" }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const insight = profile?.latestInsight;
  const sportLabel = appContext?.sportLabel || profile?.sport || "team";
  const who = role === "coach" ? "coach" : "player";

  const system =
    `You are a friendly AI assistant on RallyHQ, a ${sportLabel} team app. ` +
    `You are helping a ${who}. ` +
    "Answer questions using ONLY the team data provided below — schedule, announcements, roster, stats, exercises, and RSVPs. " +
    "You can also give sport-specific training and recovery advice. " +
    "If something isn't in the data, say so and tell them which part of the app to check (Schedule, Stats, Announcements, etc.). " +
    "Keep replies concise (2-4 short paragraphs). Be encouraging and practical.";

  const context =
    `Player: ${profile?.name || "Player"} (${profile?.position || "Player"})\n` +
    `Sport: ${sportLabel}\n` +
    `Games logged: ${profile?.gamesPlayed ?? 0}\n` +
    `Season stats: ${JSON.stringify(profile?.statTotals || {})}\n` +
    `Per-game averages: ${JSON.stringify(profile?.perGameStats || {})}\n` +
    `Wellness score: ${profile?.wellnessScore ?? "n/a"}\n` +
    `Strengths: ${(profile?.computedStrengths || []).join("; ")}\n` +
    `Focus areas: ${(profile?.computedImprovements || []).join("; ")}\n` +
    (insight?.summary ? `Latest AI coach summary: ${insight.summary}\n` : "") +
    "\n--- Team app data ---\n" +
    formatAppContextForPrompt(appContext);

  const prior = history
    .slice(-8)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 600,
    system: system + "\n\nContext:\n" + context,
    messages: [...prior, { role: "user", content: message }],
  });

  const text = msg.content.find((b) => b.type === "text")?.text?.trim();
  return {
    reply: text || "I can help with your schedule, team updates, stats, and training — what would you like to know?",
    source: "claude",
  };
}

function answerSportChatRules({ profile, message, appContext, role = "player" }) {
  const sport = appContext?.sport || profile?.sport || "volleyball";
  if (sport === "basketball") return answerBasketballChatRules({ profile, message, appContext, role });
  if (sport === "soccer") return answerSoccerChatRules({ profile, message, appContext, role });
  return answerVolleyballChatRules({ profile, message, appContext, role });
}

function answerBasketballChatRules({ profile, message, appContext, role }) {
  const q = message.toLowerCase();
  const name = profile?.name?.split(" ")[0] || "there";

  if (/shoot|shot|three|free throw|scoring|points/.test(q)) {
    return {
      reply:
        `For shooting, ${name}, balance your base, follow through, and aim for a smooth arc. ` +
        `Practice game-speed reps — catch, square up, shoot. Track your points in RallyHQ after each game.`,
      source: "rules",
    };
  }
  if (/rebound|box out|board/.test(q)) {
    return {
      reply:
        `Rebounding wins possessions: find your player, hit them with a forearm, then go get the ball with two hands. ` +
        `Crash the boards on every shot when you're near the paint.`,
      source: "rules",
    };
  }
  if (/assist|pass|ball movement|playmaker/.test(q)) {
    return {
      reply:
        `Good teams share the ball — drive, kick, and keep defenders moving. ` +
        `Look for open teammates one pass ahead and deliver crisp passes to their shooting pocket.`,
      source: "rules",
    };
  }
  if (/defense|steal|block|foul/.test(q)) {
    return {
      reply:
        `Stay in a stance, move your feet, and contest without reaching. ` +
        `Communicate switches and help-side coverage every possession.`,
      source: "rules",
    };
  }

  return defaultChatReply({ name, appContext, profile, role });
}

function answerSoccerChatRules({ profile, message, appContext, role }) {
  const q = message.toLowerCase();
  const name = profile?.name?.split(" ")[0] || "there";

  if (/goal|score|finish|strik/.test(q)) {
    return {
      reply:
        `In front of goal, ${name}, get your body over the ball and pick a corner early. ` +
        `One-touch finishes come from being on the move before the cross arrives.`,
      source: "rules",
    };
  }
  if (/pass|possession|build|play out/.test(q)) {
    return {
      reply:
        `Keep possession with quick, firm passes and constant movement off the ball. ` +
        `Scan before you receive so you know your next option.`,
      source: "rules",
    };
  }
  if (/defend|tackle|intercept|mark/.test(q)) {
    return {
      reply:
        `Defend with patience — stay goal-side, jockey the attacker, and tackle only when you're sure you'll win it. ` +
        `Talk to your back line so everyone knows who steps and who covers.`,
      source: "rules",
    };
  }
  if (/keeper|goalie|save/.test(q)) {
    return {
      reply:
        `Goalkeepers: set your line, communicate loudly, and use your feet to narrow angles. ` +
        `Organize the defense on set pieces and distribute quickly to start counters.`,
      source: "rules",
    };
  }

  return defaultChatReply({ name, appContext, profile, role });
}

function defaultChatReply({ name, appContext, profile, role }) {
  const sportLabel = appContext?.sportLabel || "your sport";
  const topStrong = profile?.computedStrengths?.[0];
  if (role === "coach") {
    return {
      reply:
        `I can help with your **${sportLabel}** team's **schedule**, **roster**, **announcements**, and **stats**. ` +
        `Try asking "What's on the schedule this week?" or "Who's on the roster?"`,
      source: "rules",
    };
  }
  return {
    reply:
      `Hey ${name}! I can help with your **schedule**, **announcements**, **stats**, **exercises**, and **training tips** for ${sportLabel}. ` +
      (topStrong ? `You're doing well with ${topStrong.toLowerCase().replace(/\.$/, "")} — ask me how to build on that.` : 'Try asking "What\'s on the schedule this week?"'),
    source: "rules",
  };
}

function answerVolleyballChatRules({ profile, message, appContext, role }) {
  const q = message.toLowerCase();
  const name = profile?.name?.split(" ")[0] || "there";
  const pos = (profile?.position || "").toLowerCase();
  const topWeak = profile?.computedImprovements?.[0];
  const topStrong = profile?.computedStrengths?.[0];

  if (/serve|ace|float|jump serve/.test(q)) {
    return {
      reply:
        `For serving, ${name}, focus on a consistent toss and contact the ball at your highest reach. ` +
        `Start with a float serve — firm hand, no spin — and aim deep corners. ` +
        (topWeak?.toLowerCase().includes("ace")
          ? `Your stats show room to grow on aces — try 10 minutes of target serving after practice.`
          : `Track your aces in RallyHQ after each match to see progress.`),
      source: "rules",
    };
  }

  if (/dig|defense|pass|receive|libero/.test(q)) {
    return {
      reply:
        `Good digging starts low: athletic stance, platform arms together, move your feet before you swing. ` +
        `Read the hitter's shoulder and angle early. ` +
        (pos.includes("libero") || pos.includes("defensive")
          ? `As a ${profile.position}, prioritize first contact — call the ball and hold your platform through contact.`
          : `Even if you're not libero, solid passing wins rallies — work on short, medium, and deep passes.`),
      source: "rules",
    };
  }

  if (/block|middle|mb/.test(q)) {
    return {
      reply:
        `Blocking is about timing and hands: jump on the setter's release, penetrate the net, and seal the line or angle based on the scout. ` +
        `Middle blockers should work on quick footwork — slide, commit, and recover fast. ` +
        (topStrong?.toLowerCase().includes("block")
          ? `Your block numbers are a strength — keep reading the setter and trusting your jump.`
          : `Film one rotation of your block footwork and compare left vs. right side.`),
      source: "rules",
    };
  }

  if (/hit|attack|kill|spike|approach/.test(q)) {
    return {
      reply:
        `On attacks, accelerate through your approach: slow-to-fast last two steps, high reach, and snap your wrist for topspin. ` +
        `Mix shots — line, cross, tip — so blockers can't sit on you. ` +
        (topWeak?.toLowerCase().includes("kill")
          ? `Your AI analysis flagged kills as a growth area — add 20 reps of high-ball approaches after warm-up.`
          : `Ask your setter for sets on different tempos so you can hit in-system and out-of-system.`),
      source: "rules",
    };
  }

  if (/set|setter|hands|tempo/.test(q)) {
    return {
      reply:
        `Setters: hands early, feet to the ball, and deliver a consistent tempo — high outside, quicker middle, back set with shoulders square. ` +
        `Communicate loudly ("here!", "help!", "out!") every rally. Run the offense your pass allows — don't force a fast set on a bad pass.`,
      source: "rules",
    };
  }

  if (/sore|energy|recover|sleep|wellness|tired|injury/.test(q)) {
    const sore = profile?.recentCheckins?.length
      ? profile.recentCheckins.reduce((s, c) => s + c.soreness, 0) / profile.recentCheckins.length
      : null;
    return {
      reply:
        `Recovery is part of performance. Hydrate, sleep 8+ hours when you can, and use ice or light stretching on sore areas. ` +
        (sore != null && sore >= 3.5
          ? `Your recent check-ins show higher soreness — consider lighter jumping reps and extra recovery before big matches.`
          : `Keep logging daily check-ins in RallyHQ so your coach can spot fatigue early.`) +
        ` If pain is sharp or getting worse, tell your coach — don't push through real injuries.`,
      source: "rules",
    };
  }

  if (/improve|better|weak|focus|tip|help/.test(q)) {
    const tips = profile?.computedImprovements?.slice(0, 2).join(" ") || "Keep logging games and check-ins.";
    return {
      reply:
        `Based on your RallyHQ data, ${name}, focus on: ${tips} ` +
        `Pick one skill this week, drill it for 15 minutes per practice, and track stats in your next match. Small, consistent work beats cramming before games.`,
      source: "rules",
    };
  }

  if (/rotation|6-2|5-1|lineup|position/.test(q)) {
    return {
      reply:
        `Know your base rotation and who covers what on serve receive. ` +
        (profile?.position
          ? `As a ${profile.position}, learn your front-row and back-row responsibilities in each rotation — blocking, attacking, and passing zones.`
          : `Walk through each rotation on paper: who passes, who sets backup, and where you block.`) +
        ` Ask your coach which system you run (5-1 vs 6-2) and study one rotation per day.`,
      source: "rules",
    };
  }

  return defaultChatReply({ name, appContext, profile, role });
}
