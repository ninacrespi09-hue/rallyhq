import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { blockParentApi, isCoach } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (blockParentApi(user)) {
    return NextResponse.json({ error: "Parents cannot view the wellness kit." }, { status: 403 });
  }
  if (!user.team_id) return NextResponse.json({ items: [] });

  const items = getDb()
    .prepare(
      `SELECT id, item_name, quantity, sort_order, created_at, updated_at
       FROM wellness_kit_items
       WHERE team_id = ?
       ORDER BY sort_order ASC, id ASC`
    )
    .all(user.team_id);

  return NextResponse.json({ items });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isCoach(user)) {
    return NextResponse.json({ error: "Only coaches can update the wellness kit." }, { status: 403 });
  }
  if (!user.team_id) {
    return NextResponse.json({ error: "Join or create a team first." }, { status: 400 });
  }

  const { item_name, quantity } = await req.json();
  const name = (item_name || "").trim();
  if (!name) return NextResponse.json({ error: "Item name is required." }, { status: 400 });
  if (name.length > 120) {
    return NextResponse.json({ error: "Keep item names under 120 characters." }, { status: 400 });
  }

  const qty = (quantity || "").trim() || null;
  const maxOrder = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM wellness_kit_items WHERE team_id = ?")
    .get(user.team_id).m;

  const result = getDb()
    .prepare(
      `INSERT INTO wellness_kit_items (team_id, item_name, quantity, sort_order, updated_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(user.team_id, name, qty, maxOrder + 1, user.id);

  return NextResponse.json({
    ok: true,
    id: result.lastInsertRowid,
    item_name: name,
    quantity: qty,
    sort_order: maxOrder + 1,
  });
}

export async function PATCH(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isCoach(user)) {
    return NextResponse.json({ error: "Only coaches can update the wellness kit." }, { status: 403 });
  }

  const { id, item_name, quantity } = await req.json();
  const itemId = Number(id);
  if (!itemId) return NextResponse.json({ error: "Item id is required." }, { status: 400 });

  const existing = getDb()
    .prepare("SELECT team_id FROM wellness_kit_items WHERE id = ?")
    .get(itemId);
  if (!existing || existing.team_id !== user.team_id) {
    return NextResponse.json({ error: "Item not found on your team." }, { status: 404 });
  }

  const name = (item_name || "").trim();
  if (!name) return NextResponse.json({ error: "Item name is required." }, { status: 400 });
  if (name.length > 120) {
    return NextResponse.json({ error: "Keep item names under 120 characters." }, { status: 400 });
  }

  const qty = (quantity || "").trim() || null;
  getDb()
    .prepare(
      `UPDATE wellness_kit_items
       SET item_name = ?, quantity = ?, updated_by = ?, updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(name, qty, user.id, itemId);

  return NextResponse.json({ ok: true, id: itemId, item_name: name, quantity: qty });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isCoach(user)) {
    return NextResponse.json({ error: "Only coaches can update the wellness kit." }, { status: 403 });
  }

  const { id } = await req.json();
  const itemId = Number(id);
  if (!itemId) return NextResponse.json({ error: "Item id is required." }, { status: 400 });

  const existing = getDb()
    .prepare("SELECT team_id FROM wellness_kit_items WHERE id = ?")
    .get(itemId);
  if (!existing || existing.team_id !== user.team_id) {
    return NextResponse.json({ error: "Item not found on your team." }, { status: 404 });
  }

  getDb().prepare("DELETE FROM wellness_kit_items WHERE id = ?").run(itemId);
  return NextResponse.json({ ok: true });
}
