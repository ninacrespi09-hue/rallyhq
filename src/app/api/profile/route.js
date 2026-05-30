import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Update the logged-in user's own profile.
export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { name, position, jersey_number, height_cm, bio } = await req.json();
  getDb()
    .prepare(
      `UPDATE users SET name = ?, position = ?, jersey_number = ?, height_cm = ?, bio = ?
       WHERE id = ?`
    )
    .run(
      name?.trim() || user.name,
      position || null,
      jersey_number ? Number(jersey_number) : null,
      height_cm ? Number(height_cm) : null,
      bio || null,
      user.id
    );

  return NextResponse.json({ ok: true });
}
