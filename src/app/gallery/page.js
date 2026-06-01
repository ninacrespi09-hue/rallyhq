import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import Gallery from "@/components/Gallery";

export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  // Newest first — chronological highlight reel.
  const media = db
    .prepare(
      `SELECT m.*, e.title AS event_title, e.type AS event_type, u.name AS uploader_name,
         (SELECT COUNT(*) FROM media_likes ml WHERE ml.media_id = m.id) AS like_count,
         EXISTS(SELECT 1 FROM media_likes ml WHERE ml.media_id = m.id AND ml.user_id = ?) AS liked
       FROM media m
       LEFT JOIN events e ON e.id = m.event_id
       JOIN users u ON u.id = m.uploaded_by
       WHERE u.team_id = ?
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 120`
    )
    .all(user.id, user.team_id);

  const events = db
    .prepare(
      `SELECT e.id, e.title, e.type FROM events e
       JOIN users u ON u.id = e.created_by
       WHERE u.team_id = ? AND e.type IN ('game','tournament') ORDER BY e.start_time DESC LIMIT 40`
    )
    .all(user.team_id);

  return (
    <NavShell user={user}>
      <Gallery user={user} media={media} events={events} />
    </NavShell>
  );
}
