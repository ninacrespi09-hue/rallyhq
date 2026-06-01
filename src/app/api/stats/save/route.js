import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveGameFromStatSheet } from "@/lib/statSheetSave";
import { createScanLogger, SCAN_STEPS } from "@/lib/statSheetLog";

/**
 * Coach-only: create a new game from reviewed stat sheet data and save stats.
 * Each call adds a new game to season history.
 */
export async function POST(req) {
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
    if (!user.team_id) {
      return NextResponse.json({ error: "No team found.", ...logger.summary() }, { status: 403 });
    }
    logger.log(SCAN_STEPS.AUTH_CHECK, "done");

    const { match, players, createMissingPlayers } = await req.json();
    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "At least one player row is required.", ...logger.summary() },
        { status: 400 }
      );
    }

    const linked = players.filter((r) => r.user_id);
    const toCreate = (createMissingPlayers || []).length;
    if (!linked.length && !toCreate) {
      return NextResponse.json(
        {
          error: "Link at least one player to your roster, or check “Add to roster” for new players.",
          ...logger.summary(),
        },
        { status: 400 }
      );
    }

    const result = await saveGameFromStatSheet({
      user,
      match: match || {},
      players,
      createMissingPlayers: createMissingPlayers || [],
      log: logger.log,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      message: `Saved new game vs ${match?.opponent || "opponent"} with stats for ${result.saved} player${result.saved === 1 ? "" : "s"}.`,
      ...logger.summary(),
    });
  } catch (err) {
    logger.log(SCAN_STEPS.DATABASE_SAVE, "error", err.message);
    return NextResponse.json(
      {
        error: err.message || "Could not save game stats.",
        hungAt: SCAN_STEPS.DATABASE_SAVE,
        ...logger.summary(),
      },
      { status: 500 }
    );
  }
}
