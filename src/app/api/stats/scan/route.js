import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseStatSheetImage, manualFallbackFromRoster } from "@/lib/statSheetParse";
import { createScanLogger, SCAN_STEPS, withTimeout } from "@/lib/statSheetLog";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCAN_TIMEOUT_MS = 28000;

/**
 * Coach-only: scan a stat sheet photo and return parsed rows for review.
 */
export async function POST(req) {
  const scanId = req.headers.get("x-scan-id") || `scan-${Date.now()}`;
  const logger = createScanLogger(scanId);

  try {
    logger.log(SCAN_STEPS.AUTH_CHECK, "start");
    const user = await getCurrentUser();
    if (!user) {
      logger.log(SCAN_STEPS.AUTH_CHECK, "error", "Not authenticated");
      return NextResponse.json(
        { error: "Not authenticated.", ...logger.summary() },
        { status: 401 }
      );
    }
    if (user.role !== "coach") {
      logger.log(SCAN_STEPS.AUTH_CHECK, "error", "Coach only");
      return NextResponse.json(
        { error: "Only coaches can upload stat sheets.", ...logger.summary() },
        { status: 403 }
      );
    }
    if (!user.team_id) {
      logger.log(SCAN_STEPS.AUTH_CHECK, "error", "No team");
      return NextResponse.json(
        { error: "No team found.", ...logger.summary() },
        { status: 403 }
      );
    }
    logger.log(SCAN_STEPS.AUTH_CHECK, "done");

    logger.log(SCAN_STEPS.IMAGE_UPLOAD, "start");
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      logger.log(SCAN_STEPS.IMAGE_UPLOAD, "error", "No file in form");
      return NextResponse.json(
        { error: "A photo of the stat sheet is required.", ...logger.summary() },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) {
      logger.log(SCAN_STEPS.IMAGE_UPLOAD, "error", "File too large");
      return NextResponse.json(
        { error: "Image too large (max 8MB).", ...logger.summary() },
        { status: 413 }
      );
    }

    const mediaType = file.type || "image/jpeg";
    if (!mediaType.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "")) {
      logger.log(SCAN_STEPS.IMAGE_UPLOAD, "error", `Invalid type: ${mediaType}`);
      return NextResponse.json(
        { error: "Please upload a photo (JPEG, PNG, or WebP).", ...logger.summary() },
        { status: 400 }
      );
    }
    logger.log(SCAN_STEPS.IMAGE_UPLOAD, "done", `${bytes.length} bytes, ${mediaType}`);

    logger.log(SCAN_STEPS.ROSTER_LOAD, "start");
    const db = getDb();
    const roster = db
      .prepare(
        `SELECT id, name, jersey_number FROM users WHERE role = 'player' AND team_id = ? ORDER BY name`
      )
      .all(user.team_id);
    logger.log(SCAN_STEPS.ROSTER_LOAD, "done", `${roster.length} players`);

    let parsed;
    try {
      parsed = await withTimeout(
        parseStatSheetImage({ buffer: bytes, mediaType, roster, log: logger.log }),
        SCAN_TIMEOUT_MS,
        "stat_sheet_scan"
      );
    } catch (err) {
      const isTimeout = err.message?.includes("timed out");
      logger.log(
        isTimeout ? SCAN_STEPS.OCR_EXTRACTION : logger.lastStep() || SCAN_STEPS.STAT_PARSING,
        isTimeout ? "timeout" : "error",
        err.message
      );
      const fallback = manualFallbackFromRoster(roster);
      return NextResponse.json(
        {
          error: isTimeout
            ? `Scan timed out during ${logger.lastStep() || "ocr_extraction"}. Try a smaller photo or enter stats manually.`
            : err.message,
          hungAt: logger.lastStep(),
          ocrError: err.message,
          ...fallback,
          ...logger.summary(),
        },
        { status: isTimeout ? 408 : 500 }
      );
    }

    logger.log(SCAN_STEPS.PREVIEW_GENERATION, "done", `source=${parsed.source}`);

    return NextResponse.json({
      ok: true,
      ...parsed,
      roster,
      ...logger.summary(),
    });
  } catch (err) {
    logger.log(logger.lastStep() || SCAN_STEPS.IMAGE_UPLOAD, "error", err.message);
    return NextResponse.json(
      {
        error: err.message || "Scan failed.",
        hungAt: logger.lastStep(),
        ocrError: err.message,
        ...logger.summary(),
      },
      { status: 500 }
    );
  }
}
