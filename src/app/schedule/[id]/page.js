import { redirect, notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { eventTeamId } from "@/lib/tenancy";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { fmtDateTime, getEventStyle, isCompetitive } from "@/lib/format";
import EventDetail from "@/components/EventDetail";
import { isCoach } from "@/lib/permissions";

const EventEditor = dynamic(() => import("@/components/EventEditor"));

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

  const isGame = isCompetitive(event.type);

  const attendance = isGame
    ? []
    : db.prepare("SELECT user_id, status FROM attendance WHERE event_id = ?").all(event.id);
  const rsvps = db
    .prepare("SELECT user_id, status FROM event_rsvps WHERE event_id = ?")
    .all(event.id);
  const result = isGame ? null : db.prepare("SELECT * FROM game_results WHERE event_id = ?").get(event.id);
  const stats = isGame
    ? []
    : db
        .prepare(
          `SELECT ps.*, u.name FROM player_stats ps JOIN users u ON u.id = ps.user_id WHERE ps.event_id = ?`
        )
        .all(event.id);

  const s = getEventStyle(event.type);

  return (
    <NavShell user={user}>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Badge className={s.chip}>{s.label}</Badge>
            <h1 className="mt-2 text-2xl font-extrabold text-navy-900">
              {event.title}
              {isGame && event.opponent ? ` vs ${event.opponent}` : ""}
            </h1>
            <p className="text-sm text-navy-500">
              {fmtDateTime(event.start_time)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.notes && <p className="mt-2 text-sm text-navy-600">{event.notes}</p>}
          </div>
          {isCoach(user) && <EventEditor event={event} />}
        </div>
      </div>

      <EventDetail
        event={event}
        user={user}
        players={players}
        initialAttendance={attendance}
        initialRsvps={rsvps}
        initialResult={result}
        initialStats={stats}
      />
    </NavShell>
  );
}
