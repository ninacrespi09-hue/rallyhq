import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Toggle favorite (any authenticated user).
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const { favorite } = await req.json();
  getDb().prepare("UPDATE media SET favorite = ? WHERE id = ?").run(favorite ? 1 : 0, Number(id));
  return NextResponse.json({ ok: true });
}

// Delete a photo (uploader or any coach).
export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(Number(id));
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (user.role !== "coach" && row.uploaded_by !== user.id) {
    return NextResponse.json({ error: "You can only delete your own photos." }, { status: 403 });
  }

  // Best-effort remove the file from disk.
  try {
    if (row.url?.startsWith("/uploads/")) {
      fs.unlinkSync(path.join(process.cwd(), "public", row.url));
    }
  } catch {}

  db.prepare("DELETE FROM media WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}
