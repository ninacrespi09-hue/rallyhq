import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId, forbiddenTeam } from "@/lib/tenancy";
import { blockParentApi } from "@/lib/permissions";
import { optimizeUploadImage } from "@/lib/imageOptimize";

export const runtime = "nodejs";

/**
 * Upload a photo (multipart/form-data).
 * Fields: file, caption, event_id, category, players (comma list), favorite, ratio.
 */
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot upload photos." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ error: "A photo file is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8MB)." }, { status: 413 });
  }

  const safeExt = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const optimized = await optimizeUploadImage(bytes, safeExt);
  const outExt = safeExt === "png" || safeExt === "webp" ? safeExt : "jpg";
  const fname = `up-${Date.now()}-${Math.round(Math.random() * 1e6)}.${outExt}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fname), optimized);
  const url = `/uploads/${fname}`;

  const db = getDb();

  // Only game / tournament events may be linked (action photos only).
  let eventId = form.get("event_id") ? Number(form.get("event_id")) : null;
  if (eventId) {
    const ev = db.prepare("SELECT type FROM events WHERE id = ?").get(eventId);
    if (!ev || (ev.type !== "game" && ev.type !== "tournament")) eventId = null;
    else if (eventTeamId(eventId) !== user.team_id) return forbiddenTeam();
  }

  // "moment" describes the action (Serving, Hitting, …); stored in the category column.
  const moment = form.get("moment") || "Action";
  const ratio = Number(form.get("ratio")) || 1;

  const info = db
    .prepare(
      `INSERT INTO media (url, caption, event_id, category, favorite, uploaded_by, uploader_role, ratio, team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      url,
      form.get("caption") || null,
      eventId,
      moment,
      form.get("favorite") === "true" ? 1 : 0,
      user.id,
      user.role,
      ratio,
      user.team_id || null
    );

  return NextResponse.json({ ok: true, id: info.lastInsertRowid, url });
}
