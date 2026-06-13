import { getSportPageContext } from "@/lib/sportPage";
import { sportPath } from "@/lib/sportPaths";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import { contentTeamExpr, eventTeamExpr } from "@/lib/teamScope";
import Exercises from "@/components/Exercises";
import { blockParent } from "@/lib/parentPages";

export default async function ExercisesPage({ params, searchParams }) {
  const { sport } = await params;
  const { user, teamId } = await getSportPageContext(sport);
  blockParent(user);

  const db = getDb();
  const exercises = db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM exercise_completions c WHERE c.exercise_id = e.id) AS completed_count,
        EXISTS(SELECT 1 FROM exercise_completions c WHERE c.exercise_id = e.id AND c.user_id = ?) AS mine_done
       FROM exercises e
       WHERE ${contentTeamExpr("e", "created_by")} = ? ORDER BY e.category, e.id`
    )
    .all(user.id, teamId);

  const playerCount = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role='player' AND team_id = ?")
    .get(teamId).n;

  return (
    <NavShell user={user} sport={sport}>
      <Exercises user={user} initialExercises={exercises} playerCount={playerCount} />
    </NavShell>
  );
}
