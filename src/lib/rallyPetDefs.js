/** Pickable RallyPet animals — safe to import from client components. */
export const RALLY_PETS = [
  { id: "dog", label: "Dog", emoji: "🐶" },
  { id: "cat", label: "Cat", emoji: "🐱" },
  { id: "horse", label: "Horse", emoji: "🐴" },
  { id: "cow", label: "Cow", emoji: "🐮" },
  { id: "elephant", label: "Elephant", emoji: "🐘" },
  { id: "monkey", label: "Monkey", emoji: "🐵" },
  { id: "pig", label: "Pig", emoji: "🐷" },
  { id: "bear", label: "Bear", emoji: "🐻" },
  { id: "chicken", label: "Chicken", emoji: "🐔" },
  { id: "frog", label: "Frog", emoji: "🐸" },
];

export const DEFAULT_PET_ID = "dog";

/** XP thresholds — level 1 starts at 0, level 5 at 350+. */
export const PET_LEVEL_THRESHOLDS = [0, 50, 120, 220, 350];

export const GROWTH_STAGES = [
  { level: 1, label: "Tiny", scale: 0.88 },
  { level: 2, label: "Small", scale: 0.96 },
  { level: 3, label: "Growing", scale: 1 },
  { level: 4, label: "Strong", scale: 1.08 },
  { level: 5, label: "Champion", scale: 1.18 },
];

/** Shown in overlay panel — matches server award amounts. */
export const PET_EARN_HINTS = [
  { label: "Daily app visit", points: 5 },
  { label: "Wellness check-in", points: 10 },
  { label: "Exercise completed", points: 8 },
  { label: "Practice attendance", points: 15 },
  { label: "Game / tournament", points: 20 },
];

export function isValidPetId(id) {
  return RALLY_PETS.some((p) => p.id === id);
}

export function petById(id) {
  return RALLY_PETS.find((p) => p.id === id) || RALLY_PETS.find((p) => p.id === DEFAULT_PET_ID);
}

export function petLevelFromXp(xp) {
  let level = 1;
  for (let i = PET_LEVEL_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (xp >= PET_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, GROWTH_STAGES.length);
}

export function growthStageForLevel(level) {
  return GROWTH_STAGES.find((s) => s.level === level) || GROWTH_STAGES[0];
}

export function xpProgressForLevel(xp, level) {
  const idx = level - 1;
  const floor = PET_LEVEL_THRESHOLDS[idx] ?? 0;
  const ceiling = PET_LEVEL_THRESHOLDS[idx + 1];
  if (ceiling == null) return { current: xp - floor, needed: 0, pct: 100 };
  const current = xp - floor;
  const needed = ceiling - floor;
  return { current, needed, pct: Math.min(100, Math.round((current / needed) * 100)) };
}

export function moodLabel(mood) {
  if (mood === "happy") return "Happy";
  if (mood === "sad") return "Missing you";
  return "Okay";
}
