import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Coaches set attendance for any player; players may set their own.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { id } = await params;
  const { user_id, status } = await req.json();
  const targetId = user.role === "coach" ? user_id : user.id;

  const valid = ["present", "late", "absent", "excused"];
  if (!valid.includes(status))
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  getDb()
    .prepare(
      `INSERT INTO attendance (event_id, user_id, status) VALUES (?, ?, ?)
       ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status`
    )
    .run(Number(id), targetId, status);

  return NextResponse.json({ ok: true });
}
