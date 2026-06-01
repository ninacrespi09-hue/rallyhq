import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, userTeamId, forbiddenTeam } from "@/lib/tenancy";
import { regeneratePlayerCoachInsight } from "@/lib/playerCoachInsight";
import { sheetRowToDbStats } from "@/lib/statSheetParse";
import { createScanLogger, SCAN_STEPS } from "@/lib/statSheetLog";

/**
 * Coach-only: save reviewed stat sheet rows for a game in one step.
 */
export async function POST(req, { params }) {
  const scanId = req.headers.get("x-scan-id") || `save-${Date.now()}`;
  const logger = createScanLogger(scanId);

  try {
    logger.log(SCAN_STEPS.AUTH_CHECK, "start");
    const user = await getCurrentUser();
    if (!user) {
      logger.log(SCAN_STEPS.AUTH_CHECK, "error", "Not authenticated");
      return NextResponse.json({ error: "Not authenticated.", ...logger.summary() }, { status: 401 });
    }
    if (user.role !== "coach") {
      logger.log(SCAN_STEPS.AUTH_CHECK, "error", "Coach only");
      return NextResponse.json(
        { error: "Only coaches can save stat sheets.", ...logger.summary() },
        { status: 403 }
      );
    }
    logger.log(SCAN_STEPS.AUTH_CHECK, "done");

    const { id } = await params;
    const eventId = Number(id);
    if (eventTeamId(eventId) !== user.team_id) return forbiddenTeam();

    const { players, match } = await req.json();
    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "At least one player row is required.", ...logger.summary() },
        { status: 400 }
      );
    }

    logger.log(SCAN_STEPS.DATABASE_SAVE, "start", `event ${eventId}, ${players.length} rows`);

    const db = getDb();
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId);
    if (!event) {
      logger.log(SCAN_STEPS.DATABASE_SAVE, "error", "Event not found");
      return NextResponse.json({ error: "Event not found.", ...logger.summary() }, { status: 404 });
    }

    const upsert = db.prepare(
      `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors)
       VALUES (@event_id, @user_id, @recorded_by, @kills, @hits, @assists, @aces, @digs, @blocks, @errors)
       ON CONFLICT(event_id, user_id) DO UPDATE SET
         kills=@kills, hits=@hits, assists=@assists, aces=@aces, digs=@digs,
         blocks=@blocks, errors=@errors, recorded_by=@recorded_by`
    );

    const saved = [];
    const skipped = [];

    const saveAll = db.transaction(() => {
      if (match && typeof match === "object") {
        const opponent = match.opponent?.trim();
        const date = match.date?.trim();
        const nextOpponent = opponent || event.opponent;
        const nextStart = date ? `${date}T12:00:00.000Z` : event.start_time;
        const nextTitle =
          opponent && !event.title.toLowerCase().includes(opponent.toLowerCase())
            ? `vs ${opponent}`
            : event.title;

        db.prepare(`UPDATE events SET title = ?, opponent = ?, start_time = ? WHERE id = ?`).run(
          nextTitle,
          nextOpponent || null,
          nextStart,
          eventId
        );

        const ourScore = Number(match.our_score) || 0;
        const oppScore = Number(match.opp_score) || 0;
        const setScores = Array.isArray(match.set_scores)
          ? match.set_scores.map((s) => String(s).trim()).filter(Boolean)
          : [];
        const hasResult = ourScore > 0 || oppScore > 0 || setScores.length > 0;

        if (hasResult) {
          const result = ourScore >= oppScore ? "W" : "L";
          db.prepare(
            `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(event_id) DO UPDATE SET
               our_score=excluded.our_score, opp_score=excluded.opp_score,
               result=excluded.result, sets_json=excluded.sets_json`
          ).run(eventId, ourScore, oppScore, result, JSON.stringify(setScores));
        }
      }

      for (const row of players) {
        const userId = Number(row.user_id);
        if (!userId) {
          skipped.push(row.name || "Unknown player");
          continue;
        }
        if (userTeamId(userId) !== user.team_id) continue;

        const stats = sheetRowToDbStats(row);
        const hasStats = Object.values(stats).some((v) => v > 0);
        if (!hasStats && !row.name) continue;

        upsert.run({
          event_id: eventId,
          user_id: userId,
          recorded_by: user.id,
          ...stats,
        });
        saved.push(userId);
      }
    });

    saveAll();

    for (const userId of saved) {
      await regeneratePlayerCoachInsight(userId, user.team_id);
    }

    logger.log(SCAN_STEPS.DATABASE_SAVE, "done", `${saved.length} saved`);

    return NextResponse.json({
      ok: true,
      saved: saved.length,
      skipped,
      ...logger.summary(),
    });
  } catch (err) {
    logger.log(SCAN_STEPS.DATABASE_SAVE, "error", err.message);
    return NextResponse.json(
      {
        error: err.message || "Could not save stats.",
        hungAt: SCAN_STEPS.DATABASE_SAVE,
        ...logger.summary(),
      },
      { status: 500 }
    );
  }
}
