import { getDb } from "./db";
import { hashPassword } from "./auth";
import { sheetRowToDbStats } from "./statSheetParse";
import { regeneratePlayerCoachInsight } from "./playerCoachInsight";
import { SCAN_STEPS } from "./statSheetLog";
import { randomBytes } from "node:crypto";

function slugify(name) {
  return String(name || "player")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

/** Create a roster-only player (coach-added from stat sheet). */
export async function createRosterPlayer({ name, jersey_number, teamId }) {
  const db = getDb();
  const email = `sheet.${teamId}.${slugify(name)}.${Date.now()}@rallyhq.local`;
  const password_hash = await hashPassword(randomBytes(16).toString("hex"));
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, team_id, role, jersey_number)
       VALUES (?, ?, ?, ?, 'player', ?)`
    )
    .run(name.trim(), email, password_hash, teamId, jersey_number ? Number(jersey_number) : null);
  return Number(info.lastInsertRowid);
}

/**
 * Create a brand-new game from reviewed stat sheet data and save all player stats.
 * Each upload adds a new game — never overwrites prior games.
 */
export async function saveGameFromStatSheet({ user, match, players, createMissingPlayers = [], log }) {
  const db = getDb();
  const opponent = match?.opponent?.trim() || "Opponent";
  const date = match?.date?.trim();
  const startTime = date ? `${date}T12:00:00.000Z` : new Date().toISOString();
  const title = opponent.startsWith("vs") ? opponent : `vs ${opponent}`;

  log?.(SCAN_STEPS.DATABASE_SAVE, "start", "creating new game");

  const createSet = new Set(createMissingPlayers.map((i) => Number(i)));
  const createdPlayers = [];
  const resolvedPlayers = [];

  for (let i = 0; i < players.length; i++) {
    const row = { ...players[i] };
    if (!row.user_id && row.name?.trim() && createSet.has(i)) {
      row.user_id = await createRosterPlayer({
        name: row.name.trim(),
        jersey_number: row.jersey_number,
        teamId: user.team_id,
      });
      createdPlayers.push({ id: row.user_id, name: row.name.trim() });
    }
    resolvedPlayers.push(row);
  }

  const saved = [];
  const skipped = [];

  const eventId = db.transaction(() => {
    log?.(SCAN_STEPS.DATABASE_SAVE, "progress", "insert event");
    const eventInfo = db
      .prepare(
        `INSERT INTO events (type, title, opponent, start_time, created_by)
         VALUES ('game', ?, ?, ?, ?)`
      )
      .run(title, opponent, startTime, user.id);
    const newEventId = Number(eventInfo.lastInsertRowid);

    const ourScore = Number(match?.our_score) || 0;
    const oppScore = Number(match?.opp_score) || 0;
    const setScores = Array.isArray(match?.set_scores)
      ? match.set_scores.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const hasResult = ourScore > 0 || oppScore > 0 || setScores.length > 0;

    if (hasResult) {
      log?.(SCAN_STEPS.DATABASE_SAVE, "progress", "insert game result");
      const resultFlag = ourScore >= oppScore ? "W" : "L";
      db.prepare(
        `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json)
         VALUES (?, ?, ?, ?, ?)`
      ).run(newEventId, ourScore, oppScore, resultFlag, JSON.stringify(setScores));
    }

    log?.(SCAN_STEPS.DATABASE_SAVE, "progress", "save player stats");
    const upsert = db.prepare(
      `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors, service_receptions)
       VALUES (@event_id, @user_id, @recorded_by, @kills, @hits, @assists, @aces, @digs, @blocks, @errors, @service_receptions)`
    );

    for (const row of resolvedPlayers) {
      const userId = row.user_id ? Number(row.user_id) : null;
      if (!userId) {
        if (row.name?.trim()) skipped.push(row.name.trim());
        continue;
      }

      const stats = sheetRowToDbStats(row);
      upsert.run({
        event_id: newEventId,
        user_id: userId,
        recorded_by: user.id,
        ...stats,
      });
      saved.push(userId);
    }

    return newEventId;
  })();

  for (const userId of [...new Set(saved)]) {
    await regeneratePlayerCoachInsight(userId, user.team_id);
  }

  log?.(SCAN_STEPS.DATABASE_SAVE, "done", `event ${eventId}, ${saved.length} players`);

  return {
    eventId,
    saved: saved.length,
    createdPlayers,
    skipped,
  };
}
