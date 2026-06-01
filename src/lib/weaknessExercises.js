/** Maps weakness text to exercise titles (team library or built-in defaults). */
const WEAKNESS_RULES = [
  { test: (w) => /kill/i.test(w), titles: ["Wall hitting", "Jump training"] },
  { test: (w) => /serve ace|\bace\b/i.test(w), titles: ["Serving accuracy"] },
  { test: (w) => /dig/i.test(w), titles: ["Passing drills", "Wall bump passing", "Footwork ladder"] },
  { test: (w) => /block/i.test(w), titles: ["Jump training", "Footwork ladder"] },
  { test: (w) => /hit/i.test(w), titles: ["Wall hitting", "Jump training"] },
  { test: (w) => /error/i.test(w), titles: ["Wall bump passing", "Passing drills"] },
  {
    test: (w) => /sore|wellness|recover|energy|injury/i.test(w),
    titles: ["Warm-up & recovery", "Shoulder strengthening", "Injury prevention", "Resistance band work"],
  },
  { test: (w) => /attendance|check-in|check in/i.test(w), titles: ["Footwork ladder", "Passing drills"] },
];

const DEFAULT_EXERCISES = [
  { title: "Wall bump passing", reps: "30 in a row" },
  { title: "Wall hitting", reps: "3 x 20" },
  { title: "Passing drills", reps: "4 x 10" },
  { title: "Serving accuracy", reps: "5 x 6 serves" },
  { title: "Footwork ladder", reps: "4 sets" },
  { title: "Jump training", reps: "4 x 8" },
  { title: "Warm-up & recovery", reps: "10–15 min" },
  { title: "Shoulder strengthening", reps: "3 x 12" },
  { title: "Injury prevention", reps: "10 min" },
  { title: "Resistance band work", reps: "2 x 15" },
];

function findExercise(teamExercises, title) {
  const lower = title.toLowerCase();
  return (
    teamExercises.find((e) => e.title.toLowerCase() === lower) ||
    teamExercises.find((e) => e.title.toLowerCase().includes(lower.split(" ")[0]))
  );
}

function focusLabel(weakness) {
  const part = weakness.split("—")[0].trim();
  return part.replace(/\.$/, "");
}

function exerciseLine(ex, weakness) {
  const focus = focusLabel(weakness);
  const suffix = ex.completed ? " — repeat this week for consistency" : "";
  return `This week — ${ex.title} (${ex.reps})${suffix}: targets ${focus}.`;
}

function defaultLine(ex, weakness) {
  return `This week — ${ex.title} (${ex.reps}): targets ${focusLabel(weakness)}.`;
}

/**
 * Append specific weekly exercise picks to the improvements list (same string format as existing tips).
 */
export function enrichImprovementsWithExercises(result, profile) {
  if (!result?.weaknesses?.length) return result;

  const teamExercises = profile?.teamExercises || [];
  const picks = [];
  const used = new Set();

  for (const weakness of result.weaknesses) {
    const rule = WEAKNESS_RULES.find((r) => r.test(weakness));
    if (!rule) continue;

    for (const title of rule.titles) {
      if (used.has(title) || picks.length >= 3) continue;

      const fromTeam = findExercise(teamExercises, title);
      if (fromTeam && !used.has(fromTeam.title)) {
        used.add(fromTeam.title);
        picks.push(exerciseLine(fromTeam, weakness));
        continue;
      }

      const fallback = DEFAULT_EXERCISES.find((e) => e.title === title);
      if (fallback && !used.has(fallback.title)) {
        used.add(fallback.title);
        picks.push(defaultLine(fallback, weakness));
      }
    }
  }

  if (picks.length === 0 && teamExercises.length) {
    for (const ex of teamExercises.filter((e) => !e.completed).slice(0, 2)) {
      picks.push(`This week — ${ex.title} (${ex.reps}): complete this coach-recommended drill.`);
    }
  }

  if (picks.length === 0) {
    picks.push("This week — Wall bump passing (30 in a row): build a strong platform for better first contact.");
  }

  const base = (result.improvements || []).filter(
    (tip) => !/^This week — /.test(tip)
  );

  return {
    ...result,
    improvements: [...base, ...picks].slice(0, 8),
  };
}
