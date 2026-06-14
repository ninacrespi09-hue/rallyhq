import { getDb } from "./db";
import { contentTeamExpr, eventTeamExpr } from "./teamScope";
import { upcomingEvents, teamRecord } from "./queries";
import { getSportConfig } from "./sports";
import { fmtDateTime, getEventStyle } from "./format";
import { teamPlayerIds } from "./playerCoachData";

/** Team + player data from the app for AI chat context. */
export function buildAppContextForAI({ teamId, sport, userId }) {
  if (!teamId) {
    return { sport, teamId: null, upcoming: [], past: [], announcements: [], roster: [], record: { wins: 0, losses: 0 } };
  }

  const db = getDb();
  const cfg = getSportConfig(sport);

  const upcoming = upcomingEvents(20, teamId).map(formatEvent);
  const past = db
    .prepare(
      `SELECT e.*, r.result, r.our_score, r.opp_score
       FROM events e
       LEFT JOIN game_results r ON r.event_id = e.id
       WHERE ${eventTeamExpr("e")} = ? AND date(e.start_time) < date('now')
       ORDER BY e.start_time DESC LIMIT 8`
    )
    .all(teamId)
    .map((e) => ({
      ...formatEvent(e),
      result: e.result,
      score: e.result ? `${e.our_score}-${e.opp_score}` : null,
    }));

  const announcements = db
    .prepare(
      `SELECT a.title, a.body, a.category, a.pinned, a.created_at, u.name AS author
       FROM announcements a
       JOIN users u ON u.id = a.author_id
       WHERE ${contentTeamExpr("a", "author_id")} = ?
       ORDER BY a.pinned DESC, a.created_at DESC LIMIT 8`
    )
    .all(teamId)
    .map((a) => ({
      title: a.title,
      body: (a.body || "").slice(0, 280),
      category: a.category,
      pinned: !!a.pinned,
      date: a.created_at?.slice(0, 10),
      author: a.author,
    }));

  const roster = teamPlayerIds(teamId).map((p) => ({
    name: p.name,
    position: p.position,
    jersey: p.jersey_number,
  }));

  const exercises = db
    .prepare(
      `SELECT e.title, e.category, e.reps, e.difficulty
       FROM exercises e
       WHERE ${contentTeamExpr("e", "created_by")} = ?
       ORDER BY e.title LIMIT 12`
    )
    .all(teamId);

  const myRsvps = db
    .prepare(
      `SELECT e.title, e.type, e.start_time, er.status
       FROM event_rsvps er
       JOIN events e ON e.id = er.event_id
       WHERE er.user_id = ? AND ${eventTeamExpr("e")} = ? AND date(e.start_time) >= date('now')
       ORDER BY e.start_time ASC LIMIT 12`
    )
    .all(userId, teamId)
    .map((r) => ({
      title: r.title,
      type: getEventStyle(r.type).label,
      when: fmtDateTime(r.start_time),
      status: r.status,
    }));

  return {
    sport,
    sportLabel: cfg.label,
    teamId,
    record: teamRecord(teamId),
    upcoming,
    past,
    announcements,
    roster,
    exercises,
    myRsvps,
  };
}

function formatEvent(e) {
  const style = getEventStyle(e.type);
  return {
    id: e.id,
    type: style.label,
    title: e.title,
    opponent: e.opponent || null,
    when: fmtDateTime(e.start_time),
    location: e.location || null,
    notes: e.notes ? String(e.notes).slice(0, 200) : null,
  };
}

/** Compact text block for Claude system prompt. */
export function formatAppContextForPrompt(ctx) {
  if (!ctx?.teamId) return "No team data loaded.";

  const lines = [
    `Sport: ${ctx.sportLabel}`,
    `Season record: ${ctx.record.wins}W-${ctx.record.losses}L`,
    "",
    "Upcoming schedule:",
    ...(ctx.upcoming.length
      ? ctx.upcoming.map(
          (e) =>
            `- ${e.when} | ${e.type}: ${e.title}${e.opponent ? ` vs ${e.opponent}` : ""}${e.location ? ` @ ${e.location}` : ""}`
        )
      : ["- No upcoming events"]),
    "",
    "Recent results:",
    ...(ctx.past.length
      ? ctx.past.slice(0, 5).map(
          (e) =>
            `- ${e.when} | ${e.title}${e.score ? ` (${e.result} ${e.score})` : ""}`
        )
      : ["- No recent results"]),
    "",
    "Announcements:",
    ...(ctx.announcements.length
      ? ctx.announcements.map((a) => `- [${a.category}] ${a.title}: ${a.body}`)
      : ["- No announcements"]),
    "",
    "Roster:",
    ...(ctx.roster.length
      ? ctx.roster.map((p) => `- ${p.name}${p.position ? ` (${p.position})` : ""}${p.jersey != null ? ` #${p.jersey}` : ""}`)
      : ["- No players listed"]),
    "",
    "Assigned exercises:",
    ...(ctx.exercises.length
      ? ctx.exercises.map((ex) => `- ${ex.title} (${ex.category}${ex.reps ? `, ${ex.reps}` : ""})`)
      : ["- No exercises posted"]),
  ];

  if (ctx.myRsvps?.length) {
    lines.push("", "Your upcoming RSVPs:");
    ctx.myRsvps.forEach((r) => lines.push(`- ${r.when} | ${r.title}: ${r.status}`));
  }

  return lines.join("\n");
}

/** Rule-based answers for schedule and app questions (no API key). */
export function answerAppQuestionRules({ message, appContext, profile }) {
  const q = message.toLowerCase();
  const name = profile?.name?.split(" ")[0] || "there";
  const ctx = appContext;

  if (/schedule|next (game|practice|event)|when is|what.?s (on|coming up)|upcoming|this week|tomorrow|practice|game|tournament/.test(q)) {
    if (!ctx?.upcoming?.length) {
      return { reply: `Hi ${name} — there aren't any upcoming events on the schedule right now. Check the Schedule tab or ask your coach.`, source: "rules" };
    }
    const games = ctx.upcoming.filter((e) => /game|tournament/i.test(e.type));
    const practices = ctx.upcoming.filter((e) => /practice|conditioning/i.test(e.type));
    const next = ctx.upcoming[0];
    let reply = `Here's what's coming up, ${name}:\n\n`;
    reply += `**Next event:** ${next.when} — ${next.type}: ${next.title}`;
    if (next.opponent) reply += ` vs ${next.opponent}`;
    if (next.location) reply += ` at ${next.location}`;
    reply += "\n\n";
    if (games.length) {
      reply += `**Games:**\n${games.slice(0, 4).map((e) => `• ${e.when} — ${e.title}${e.opponent ? ` vs ${e.opponent}` : ""}`).join("\n")}\n`;
    }
    if (practices.length) {
      reply += `**Practices:**\n${practices.slice(0, 4).map((e) => `• ${e.when} — ${e.title}`).join("\n")}`;
    }
    return { reply: reply.trim(), source: "rules" };
  }

  if (/announcement|coach said|posted|news|update/.test(q)) {
    if (!ctx?.announcements?.length) {
      return { reply: `No announcements right now, ${name}. Check the Announcements tab — your coach will post updates there.`, source: "rules" };
    }
    const list = ctx.announcements
      .slice(0, 4)
      .map((a) => `• **${a.title}** — ${a.body}`)
      .join("\n");
    return { reply: `Recent announcements:\n\n${list}`, source: "rules" };
  }

  if (/roster|teammate|who.?s on|team list|players/.test(q)) {
    if (!ctx?.roster?.length) {
      return { reply: `I don't have roster info loaded, ${name}. Check the Players tab.`, source: "rules" };
    }
    const list = ctx.roster.map((p) => `• ${p.name}${p.position ? ` (${p.position})` : ""}`).join("\n");
    return { reply: `Your ${ctx.sportLabel} roster:\n\n${list}`, source: "rules" };
  }

  if (/record|wins?|loss(es)?|season/.test(q) && !/stat|kill|point|goal/.test(q)) {
    const { wins, losses } = ctx?.record || { wins: 0, losses: 0 };
    return {
      reply: `Your team's record is **${wins}W–${losses}L** this season. See full stats on the Stats page.`,
      source: "rules",
    };
  }

  if (/rsvp|going|attend|can i make/.test(q)) {
    if (!ctx?.myRsvps?.length) {
      return { reply: `You don't have RSVPs set for upcoming events yet, ${name}. Open an event on the Schedule and tap Going, Maybe, or Can't Go.`, source: "rules" };
    }
    const list = ctx.myRsvps.map((r) => `• ${r.when} — ${r.title}: **${r.status}**`).join("\n");
    return { reply: `Your RSVPs:\n\n${list}`, source: "rules" };
  }

  if (/exercise|workout|drill|training plan/.test(q)) {
    if (!ctx?.exercises?.length) {
      return { reply: `No exercises posted yet, ${name}. Your coach can add them under Exercises.`, source: "rules" };
    }
    const list = ctx.exercises.map((ex) => `• ${ex.title} (${ex.category})`).join("\n");
    return { reply: `Assigned exercises:\n\n${list}`, source: "rules" };
  }

  if (/my stat|how am i|how many|season stat|points|goals|rebound|assist/.test(q)) {
    const stats = profile?.statTotals;
    if (!stats || !profile?.gamesPlayed) {
      return { reply: `No game stats logged yet, ${name}. After matches, stats show up on your profile and the Stats page.`, source: "rules" };
    }
    const lines = Object.entries(stats).map(([k, v]) => `• ${k}: ${v}`).join("\n");
    return {
      reply: `Your season stats (${profile.gamesPlayed} games):\n\n${lines}\n\nSee trends on your player profile.`,
      source: "rules",
    };
  }

  if (/where|how do i|what is rally|navigate|find|app|page|tab/.test(q)) {
    return {
      reply:
        `RallyHQ has everything for your team in one place, ${name}:\n\n` +
        `• **Schedule** — games, practices, RSVP\n` +
        `• **Players** — roster and profiles\n` +
        `• **Stats** — team and player numbers\n` +
        `• **Announcements** — coach updates\n` +
        `• **Exercises** — assigned workouts\n` +
        `• **Check-in** — daily wellness\n` +
        `• **AI Coach** — that's me!\n\n` +
        `Ask me about the schedule, announcements, your stats, or training tips.`,
      source: "rules",
    };
  }

  return null;
}
