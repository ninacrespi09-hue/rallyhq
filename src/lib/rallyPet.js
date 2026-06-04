import { getDb } from "@/lib/db";
import {
  DEFAULT_PET_ID,
  GROWTH_STAGES,
  isValidPetId,
  petById,
  petLevelFromXp,
  growthStageForLevel,
  xpProgressForLevel,
} from "@/lib/rallyPetDefs";

export {
  RALLY_PETS,
  DEFAULT_PET_ID,
  isValidPetId,
  petById,
  PET_LEVEL_THRESHOLDS,
  GROWTH_STAGES,
  PET_EARN_HINTS,
} from "@/lib/rallyPetDefs";

export const PET_POINTS = {
  daily_visit: 5,
  wellness_checkin: 10,
  exercise_complete: 8,
  practice_attend: 15,
  game_attend: 20,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(older, newer) {
  const a = new Date(`${older}T12:00:00`);
  const b = new Date(`${newer}T12:00:00`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function computeMood(lastActive) {
  if (!lastActive) return "okay";
  const gap = daysBetween(lastActive, todayStr());
  if (gap <= 0) return "happy";
  if (gap === 1) return "okay";
  return "sad";
}

function ensurePetRow(userId) {
  const db = getDb();
  const row = db.prepare(`SELECT user_id FROM user_rally_pets WHERE user_id = ?`).get(userId);
  if (!row) {
    db.prepare(
      `INSERT INTO user_rally_pets (user_id, animal, xp, level, mood, last_active) VALUES (?, ?, 0, 1, 'okay', ?)`
    ).run(userId, DEFAULT_PET_ID, todayStr());
  }
}

function applyXp(userId, points) {
  const db = getDb();
  ensurePetRow(userId);
  db.prepare(`UPDATE user_rally_pets SET xp = xp + ? WHERE user_id = ?`).run(points, userId);
  const xp = db.prepare(`SELECT xp FROM user_rally_pets WHERE user_id = ?`).get(userId).xp;
  const level = petLevelFromXp(xp);
  db.prepare(`UPDATE user_rally_pets SET level = ?, updated_at = datetime('now') WHERE user_id = ?`).run(
    level,
    userId
  );
}

/** Award XP once per user/source/ref_key (idempotent). */
export function awardPetXp(userId, source, refKey, points) {
  if (!userId || !points) return false;
  const db = getDb();
  ensurePetRow(userId);
  try {
    db.prepare(
      `INSERT INTO rally_pet_xp_log (user_id, source, ref_key, points) VALUES (?, ?, ?, ?)`
    ).run(userId, source, String(refKey), points);
    applyXp(userId, points);
    return true;
  } catch {
    return false;
  }
}

function refreshMood(userId) {
  const db = getDb();
  const row = db.prepare(`SELECT last_active FROM user_rally_pets WHERE user_id = ?`).get(userId);
  const mood = computeMood(row?.last_active);
  db.prepare(`UPDATE user_rally_pets SET mood = ? WHERE user_id = ?`).run(mood, userId);
  return mood;
}

/** Daily login or app visit — all logged-in roles. */
export function recordDailyVisit(userId) {
  ensurePetRow(userId);
  const db = getDb();
  const today = todayStr();
  const awarded = awardPetXp(userId, "daily_visit", today, PET_POINTS.daily_visit);
  db.prepare(`UPDATE user_rally_pets SET last_active = ? WHERE user_id = ?`).run(today, userId);
  refreshMood(userId);
  return awarded;
}

export function awardWellnessCheckin(userId, date) {
  return awardPetXp(userId, "wellness_checkin", date || todayStr(), PET_POINTS.wellness_checkin);
}

export function awardExerciseComplete(userId, exerciseId) {
  return awardPetXp(userId, "exercise_complete", exerciseId, PET_POINTS.exercise_complete);
}

export function awardEventAttendance(userId, eventId) {
  const db = getDb();
  const event = db.prepare(`SELECT type FROM events WHERE id = ?`).get(eventId);
  const isGame = event?.type === "game" || event?.type === "tournament";
  const points = isGame ? PET_POINTS.game_attend : PET_POINTS.practice_attend;
  const source = isGame ? "game_attend" : "practice_attend";
  return awardPetXp(userId, source, eventId, points);
}

function buildSnapshot(row) {
  const animal = isValidPetId(row.animal) ? row.animal : DEFAULT_PET_ID;
  const meta = petById(animal);
  const level = row.level || petLevelFromXp(row.xp || 0);
  const stage = growthStageForLevel(level);
  const progress = xpProgressForLevel(row.xp || 0, level);
  const mood = row.mood || computeMood(row.last_active);

  return {
    animal,
    emoji: meta.emoji,
    label: meta.label,
    posX: row.pos_x,
    posY: row.pos_y,
    xp: row.xp || 0,
    level,
    stageLabel: stage.label,
    scale: stage.scale,
    mood,
    moodLabel: mood === "happy" ? "Happy" : mood === "sad" ? "Missing you" : "Okay",
    lastActive: row.last_active,
    xpCurrent: progress.current,
    xpNeeded: progress.needed,
    xpPct: progress.pct,
    maxLevel: level >= GROWTH_STAGES.length,
  };
}

/** Load saved pet (creates default row if missing). */
export function getUserPet(userId) {
  ensurePetRow(userId);
  const db = getDb();
  const row = db
    .prepare(
      `SELECT user_id, animal, pos_x, pos_y, xp, level, mood, last_active FROM user_rally_pets WHERE user_id = ?`
    )
    .get(userId);
  refreshMood(userId);
  const fresh = db
    .prepare(
      `SELECT user_id, animal, pos_x, pos_y, xp, level, mood, last_active FROM user_rally_pets WHERE user_id = ?`
    )
    .get(userId);
  return buildSnapshot(fresh || row);
}

/** Save animal and/or drag position for the user's floating pet. */
export function updateUserPet(userId, { animal, posX, posY }) {
  const db = getDb();
  getUserPet(userId);

  const sets = [];
  const values = [];

  if (animal != null) {
    if (!isValidPetId(animal)) throw new Error("Invalid pet.");
    sets.push("animal = ?");
    values.push(animal);
  }
  if (posX != null) {
    sets.push("pos_x = ?");
    values.push(Number(posX));
  }
  if (posY != null) {
    sets.push("pos_y = ?");
    values.push(Number(posY));
  }

  if (!sets.length) return getUserPet(userId);

  sets.push("updated_at = datetime('now')");
  values.push(userId);

  db.prepare(`UPDATE user_rally_pets SET ${sets.join(", ")} WHERE user_id = ?`).run(...values);
  return getUserPet(userId);
}
