import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { scanScheduleFromImage } from "@/lib/scheduleOcr";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST — coach uploads a schedule photo; returns draft events for review. */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "coach") {
    return NextResponse.json({ error: "Only coaches can upload schedules." }, { status: 403 });
  }
  if (!user.team_id) return NextResponse.json({ error: "No team found." }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "A schedule photo is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8MB)." }, { status: 413 });
  }

  const mediaType = file.type || "image/jpeg";
  if (!mediaType.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name || "")) {
    return NextResponse.json({ error: "Please upload a photo (JPEG, PNG, or WebP)." }, { status: 400 });
  }

  try {
    const result = await scanScheduleFromImage(bytes);
    return NextResponse.json({
      ok: true,
      events: result.events,
      source: result.source,
      message: result.message,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Could not scan the schedule." },
      { status: 500 }
    );
  }
}
