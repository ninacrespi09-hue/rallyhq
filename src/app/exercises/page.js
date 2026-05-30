import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavShell from "@/components/NavShell";
import { getDb } from "@/lib/db";
import Exercises from "@/components/Exercises";

export default async function ExercisesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const exercises = db
    .prepare(
      `SELECT e.*,
        (SELECT COUNT(*) FROM exercise_completions c WHERE c.exercise_id = e.id) AS completed_count,
        EXISTS(SELECT 1 FROM exercise_completions c WHERE c.exercise_id = e.id AND c.user_id = ?) AS mine_done
       FROM exercises e ORDER BY e.category, e.id`
    )
    .all(user.id);

  const playerCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='player'").get().n;

  return (
    <NavShell user={user}>
      <Exercises user={user} initialExercises={exercises} playerCount={playerCount} />
    </NavShell>
  );
}
