import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toEventIso, fromEventIso, SCHEDULE_EVENT_TYPES, normalizeUpcomingDate } from "@/lib/scheduleOcr";

const ALLOWED_TYPES = new Set(SCHEDULE_EVENT_TYPES.map((t) => t.key));

/** POST — save reviewed schedule events to the team calendar. */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "coach") {
    return NextResponse.json({ error: "Only coaches can import schedules." }, { status: 403 });
  }
  if (!user.team_id) return NextResponse.json({ error: "No team found." }, { status: 403 });

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const items = Array.isArray(body.events) ? body.events : [];
  const toSave = items.filter((e) => e.included !== false);
  if (toSave.length === 0) {
    return NextResponse.json({ error: "Select at least one event to save." }, { status: 400 });
  }

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO events (type, title, opponent, location, start_time, end_time, notes, created_by, team_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const saved = [];
  const skipped = [];

  const tx = db.transaction(() => {
    for (const e of toSave) {
      const type = ALLOWED_TYPES.has(e.type) ? e.type : "other";
      const title = (e.title || "").trim();
      const date = normalizeUpcomingDate(e.date);
      const startIso = e.start_time?.includes("T")
        ? (() => {
            const parts = fromEventIso(e.start_time);
            return toEventIso(normalizeUpcomingDate(parts.date || date), parts.time || e.start_time);
          })()
        : toEventIso(date, e.start_time);
      if (!title || !startIso) {
        skipped.push({ title: title || "(untitled)", reason: "Title and start time are required." });
        continue;
      }
      const endIso = e.end_time
        ? e.end_time.includes("T")
          ? (() => {
              const parts = fromEventIso(e.end_time);
              return toEventIso(normalizeUpcomingDate(parts.date || date), parts.time || e.end_time);
            })()
          : toEventIso(date, e.end_time)
        : null;
      const info = insert.run(
        type,
        title,
        e.opponent?.trim() || null,
        e.location?.trim() || null,
        startIso,
        endIso,
        e.notes?.trim() || null,
        user.id,
        user.team_id
      );
      saved.push(info.lastInsertRowid);
    }
  });

  tx();

  if (saved.length === 0) {
    return NextResponse.json(
      { error: skipped[0]?.reason || "No valid events to save." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    saved: saved.length,
    ids: saved,
    skipped,
    message: `Added ${saved.length} event${saved.length === 1 ? "" : "s"} to the team schedule.`,
  });
}
