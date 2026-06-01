import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import Exercises from "@/components/Exercises";
import { blockParent } from "@/lib/parentPages";

export default async function ExercisesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  blockParent(user);

  const db = getDb();
  const exercises = db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM exercise_completions c WHERE c.exercise_id = e.id) AS completed_count,
        EXISTS(SELECT 1 FROM exercise_completions c WHERE c.exercise_id = e.id AND c.user_id = ?) AS mine_done
       FROM exercises e JOIN users u ON u.id = e.created_by
       WHERE u.team_id = ? ORDER BY e.category, e.id`
    )
    .all(user.id, user.team_id);

  const playerCount = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role='player' AND team_id = ?")
    .get(user.team_id).n;

  return (
    <NavShell user={user}>
      <Exercises user={user} initialExercises={exercises} playerCount={playerCount} />
    </NavShell>
  );
}
