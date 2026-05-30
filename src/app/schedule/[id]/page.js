import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { fmtDateTime, EVENT_STYLES, isCompetitive } from "@/lib/format";
import EventDetail from "@/components/EventDetail";
import PostGameWellness from "@/components/PostGameWellness";

export default async function EventPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(Number(id));
  if (!event) notFound();

  const players = db
    .prepare("SELECT id, name, position, jersey_number FROM users WHERE role='player' ORDER BY name")
    .all();

  const attendance = db.prepare("SELECT user_id, status FROM attendance WHERE event_id = ?").all(event.id);
  const result = db.prepare("SELECT * FROM game_results WHERE event_id = ?").get(event.id);
  const stats = db
    .prepare(
      `SELECT ps.*, u.name FROM player_stats ps JOIN users u ON u.id = ps.user_id WHERE ps.event_id = ?`
    )
    .all(event.id);

  const isGame = isCompetitive(event.type);
  const wellnessSubs = isGame
    ? db
        .prepare(
          `SELECT w.*, u.name FROM post_game_checkins w JOIN users u ON u.id = w.user_id
           WHERE w.event_id = ? ORDER BY u.name`
        )
        .all(event.id)
    : [];
  const myWellness = isGame
    ? db.prepare("SELECT * FROM post_game_checkins WHERE event_id = ? AND user_id = ?").get(event.id, user.id)
    : null;

  const s = EVENT_STYLES[event.type];

  return (
    <NavShell user={user}>
      <div className="mb-4">
        <span className={`chip ${s.chip}`}>{s.label}</span>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{event.title}</h1>
        <p className="text-sm text-slate-500">
          {fmtDateTime(event.start_time)}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        {event.notes && <p className="mt-2 text-sm text-slate-600">{event.notes}</p>}
      </div>

      {isGame && (
        <div className="mb-5">
          <PostGameWellness
            event={event}
            user={user}
            players={players}
            submissions={wellnessSubs}
            mine={myWellness}
          />
        </div>
      )}

      <EventDetail
        event={event}
        user={user}
        players={players}
        initialAttendance={attendance}
        initialResult={result}
        initialStats={stats}
      />
    </NavShell>
  );
}
