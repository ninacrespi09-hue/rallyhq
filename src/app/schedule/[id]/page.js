import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { eventTeamId } from "@/lib/tenancy";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { fmtDateTime, EVENT_STYLES, isCompetitive } from "@/lib/format";
import EventDetail from "@/components/EventDetail";
import PostGameWellness from "@/components/PostGameWellness";
import EventEditor from "@/components/EventEditor";

export default async function EventPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(Number(id));
  if (!event) notFound();
  if (eventTeamId(event.id) !== user.team_id) notFound();

  const players = db
    .prepare("SELECT id, name, position, jersey_number FROM users WHERE role='player' AND team_id = ? ORDER BY name")
    .all(user.team_id);

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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className={`chip ${s.chip}`}>{s.label}</span>
            <h1 className="mt-2 text-2xl font-extrabold text-navy-900">{event.title}</h1>
            <p className="text-sm text-navy-500">
              {fmtDateTime(event.start_time)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.notes && <p className="mt-2 text-sm text-navy-600">{event.notes}</p>}
          </div>
          {user.role === "coach" && <EventEditor event={event} />}
        </div>
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
