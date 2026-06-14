// Seed RallyHQ with a realistic demo team, schedule, stats, and check-ins.
// Run with: npm run seed
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/lib/db.js";

const db = getDb();

// ---- reset ----
for (const t of [
  "wellness_kit_suggestions",
  "wellness_kit_items",
  "ai_insights",
  "media_likes",
  "media",
  "exercise_completions",
  "exercises",
  "player_notes",
  "checkins",
  "post_game_checkins",
  "player_stats",
  "game_results",
  "attendance",
  "announcements",
  "events",
  "users",
  "teams",
]) {
  db.prepare(`DELETE FROM ${t}`).run();
}
db.prepare("DELETE FROM sqlite_sequence").run();

// ---- demo team ----
const teamId = db
  .prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)")
  .run("RallyHQ Demo", "DEMO01", "volleyball").lastInsertRowid;

const hash = bcrypt.hashSync("password123", 10);
const iso = (d) => d.toISOString();
const dayStr = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const at = (offset, hour, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, min, 0, 0);
  return iso(d);
};

// ---- users ----
const insertUser = db.prepare(
  `INSERT INTO users (name, email, password_hash, role, team_id, position, jersey_number, height_cm, bio)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const coachId = insertUser.run(
  "Coach Dana Park",
  "coach@rallyhq.dev",
  hash,
  "coach",
  teamId,
  null,
  null,
  null,
  null
).lastInsertRowid;

const players = [
  ["Maya Chen", "maya@rallyhq.dev", "Setter", 7, 175, "Quarterback of the offense. Loves a quick tempo."],
  ["Sofia Reyes", "sofia@rallyhq.dev", "Libero", 3, 168, "Defensive anchor. Never lets a ball drop."],
  ["Jordan Blake", "jordan@rallyhq.dev", "Outside Hitter", 11, 182, "Go-to attacker in big moments."],
  ["Ava Thompson", "ava@rallyhq.dev", "Middle Blocker", 14, 188, "Wall at the net."],
  ["Lena Müller", "lena@rallyhq.dev", "Opposite", 9, 184, "Big right-side swing."],
  ["Priya Nair", "priya@rallyhq.dev", "Outside Hitter", 6, 178, "All-around six-rotation player."],
  ["Zoe Adams", "zoe@rallyhq.dev", "Middle Blocker", 12, 186, "Quick slides and stuff blocks."],
  ["Nina Costa", "nina@rallyhq.dev", "Defensive Specialist", 4, 170, "Serve-receive specialist."],
];

const playerIds = players.map((p) =>
  insertUser.run(p[0], p[1], hash, "player", teamId, p[2], p[3], p[4], p[5]).lastInsertRowid
);

// ---- events ----
const insertEvent = db.prepare(
  `INSERT INTO events (type, title, opponent, location, start_time, end_time, notes, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

// Past games (with results + stats)
const pastGames = [
  ["game", "vs. Lincoln High", "Lincoln High", "Home Gym", -12, "W", 3, 1],
  ["game", "@ Westfield Prep", "Westfield Prep", "Westfield Gym", -8, "L", 1, 3],
  ["tournament", "Spring Classic — Pool A", "Riverside", "Convention Center", -5, "W", 2, 0],
];

const gameEventIds = [];
for (const [type, title, opp, loc, off, result, ours, opps] of pastGames) {
  const id = insertEvent.run(type, title, opp, loc, at(off, 17), at(off, 19), null, coachId).lastInsertRowid;
  gameEventIds.push(id);
  db.prepare(
    `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json) VALUES (?, ?, ?, ?, ?)`
  ).run(id, ours, opps, result, JSON.stringify([]));
}

// Past practices
insertEvent.run("practice", "Team Practice", null, "Main Gym", at(-10, 18), at(-10, 20), "Serve-receive focus", coachId);
insertEvent.run("practice", "Team Practice", null, "Main Gym", at(-3, 18), at(-3, 20), "Blocking drills", coachId);

// Upcoming
insertEvent.run("practice", "Team Practice", null, "Main Gym", at(1, 18), at(1, 20), "Bring white jerseys", coachId);
insertEvent.run("game", "vs. Oakmont Academy", "Oakmont Academy", "Home Gym", at(3, 17, 30), at(3, 19, 30), "Senior night!", coachId);
insertEvent.run("practice", "Team Practice", null, "Main Gym", at(5, 18), at(5, 20), null, coachId);
insertEvent.run("tournament", "Coastal Invitational", "Multiple", "Coastal Sports Complex", at(9, 9), at(9, 18), "All-day tournament. Pack lunch.", coachId);

// Team bonding events
insertEvent.run("bonding", "Team Dinner at Tony's", null, "Tony's Trattoria", at(2, 19), at(2, 21), "Casual team dinner — bring your appetite!", coachId);
insertEvent.run("bonding", "Beach Day at Cove Park", null, "Cove Park Beach", at(7, 11), at(7, 16), "Sand volleyball, snacks, and sun. Bring sunscreen!", coachId);
insertEvent.run("bonding", "Team Outing — Mini Golf", null, "Putt Putt Palace", at(14, 17), at(14, 19), "Friendly mini-golf tournament.", coachId);
insertEvent.run("bonding", "End-of-Season Celebration", null, "School Hall", at(28, 18), at(28, 21), "Awards night and celebration dinner.", coachId);
// A past bonding event
insertEvent.run("bonding", "Welcome Team Dinner", null, "Tony's Trattoria", at(-14, 19), at(-14, 21), "Season kickoff dinner.", coachId);

// ---- attendance (past practice -3) ----
const pastPractice = db.prepare("SELECT id FROM events WHERE type='practice' AND date(start_time)=date('now','-3 days')").get();
if (pastPractice) {
  const statuses = ["present", "present", "present", "late", "present", "present", "absent", "present"];
  playerIds.forEach((pid, i) => {
    db.prepare("INSERT INTO attendance (event_id, user_id, status) VALUES (?, ?, ?)").run(
      pastPractice.id,
      pid,
      statuses[i] || "present"
    );
  });
}

// ---- player stats for past games ----
const insertStat = db.prepare(
  `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// rough per-position stat profiles, varied per game ("hits" = attack attempts)
const profile = (pos) => {
  switch (pos) {
    case "Setter": return { kills: 2, hits: 5, assists: 28, aces: 2, digs: 6, blocks: 1, errors: 2 };
    case "Libero": return { kills: 0, hits: 1, assists: 3, aces: 1, digs: 18, blocks: 0, errors: 1 };
    case "Defensive Specialist": return { kills: 0, hits: 2, assists: 1, aces: 2, digs: 12, blocks: 0, errors: 1 };
    case "Middle Blocker": return { kills: 8, hits: 16, assists: 0, aces: 0, digs: 2, blocks: 6, errors: 2 };
    case "Opposite": return { kills: 12, hits: 26, assists: 1, aces: 1, digs: 4, blocks: 3, errors: 4 };
    default: return { kills: 11, hits: 24, assists: 1, aces: 2, digs: 7, blocks: 2, errors: 3 }; // Outside Hitter
  }
};

gameEventIds.forEach((eid, gi) => {
  playerIds.forEach((pid, i) => {
    const pos = players[i][2];
    const base = profile(pos);
    const j = gi + i; // deterministic variation
    insertStat.run(
      eid,
      pid,
      coachId,
      Math.max(0, base.kills + ((j % 4) - 1)),
      Math.max(0, base.hits + ((j % 5) - 2)),
      Math.max(0, base.assists + (base.assists ? (j % 5) - 2 : 0)),
      Math.max(0, base.aces + (j % 2)),
      Math.max(0, base.digs + ((j % 3) - 1)),
      Math.max(0, base.blocks + (j % 2)),
      Math.max(0, base.errors + (j % 3))
    );
  });
});

// ---- check-ins (last 6 days) with intentional trends for the AI ----
const insertCheckin = db.prepare(
  `INSERT INTO checkins (user_id, date, soreness, energy, mood, injury, sore_areas, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

// Player 0 (Maya): rising soreness trend
// Player 1 (Sofia): low energy streak
// Player 3 (Ava): injury report
// Others: healthy baseline
const trends = {
  0: (d) => ({ soreness: Math.min(5, 2 + d), energy: 4, mood: 4, injury: 0, areas: d >= 3 ? "Shoulder" : "", note: d >= 4 ? "Shoulder tightening on serves" : "" }),
  1: () => ({ soreness: 2, energy: 2, mood: 3, injury: 0, areas: "", note: "" }),
  3: (d) => ({ soreness: d >= 4 ? 4 : 3, energy: 3, mood: 3, injury: d >= 4 ? 1 : 0, areas: d >= 4 ? "Ankle" : "", note: d >= 4 ? "Rolled ankle in practice" : "" }),
};

for (let i = 0; i < playerIds.length; i++) {
  for (let d = 0; d <= 5; d++) {
    const date = dayStr(-(5 - d)); // oldest .. today
    const t = trends[i]?.(d) || {
      soreness: 2 + ((i + d) % 2),
      energy: 4 - ((i + d) % 2),
      mood: 4,
      injury: 0,
      areas: "",
      note: "",
    };
    insertCheckin.run(playerIds[i], date, t.soreness, t.energy, t.mood, t.injury, t.areas || null, t.note || null);
  }
}

// ---- post-game wellness (for the most recent game) ----
const latestGameId = gameEventIds[gameEventIds.length - 1];
const insertWellness = db.prepare(
  `INSERT INTO post_game_checkins
     (event_id, user_id, soreness, energy, mood, recovery, injury, sore_areas, recovery_needs, note)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// index-keyed profiles; everyone else defaults to healthy
const wellnessByIdx = {
  0: [4, 4, 4, 4, 0, "Shoulder", "Ice,Physio", "Shoulder tight after a heavy serving night"], // Maya — needs rest
  1: [2, 2, 3, 3, 0, "", "Extra sleep", "Legs feel heavy, low energy"],                         // Sofia — monitor
  3: [4, 3, 3, 4, 1, "Ankle", "Rest day,Ice", "Rolled my ankle late in the match"],             // Ava — needs rest
  2: [3, 4, 5, 2, 0, "", "Stretching", "Felt great, just a bit tight"],                          // Jordan — ok
};

playerIds.forEach((pid, i) => {
  const w = wellnessByIdx[i] || [2, 4, 5, 2, 0, "", "Hydration", ""];
  insertWellness.run(latestGameId, pid, w[0], w[1], w[2], w[3], w[4], w[5] || null, w[6] || null, w[7] || null);
});

// ---- media gallery (generated SVG placeholder photos) ----
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
// clean previous seed images
for (const f of fs.readdirSync(uploadsDir)) {
  if (f.startsWith("seed-")) fs.unlinkSync(path.join(uploadsDir, f));
}

// ---- generate player profile avatars ----
const AVATAR_COLORS = [
  ["#60a5fa", "#1e3a8a"], ["#22d3ee", "#2563eb"], ["#38bdf8", "#1d4ed8"],
  ["#818cf8", "#1e3a8a"], ["#0ea5e9", "#172554"], ["#06b6d4", "#1e40af"],
  ["#3b82f6", "#0d1730"], ["#0284c7", "#1e3a8a"],
];
const setPhoto = db.prepare("UPDATE users SET photo_url = ? WHERE id = ?");
playerIds.forEach((pid, i) => {
  const name = players[i][0];
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [c1, c2] = AVATAR_COLORS[i % AVATAR_COLORS.length];
  const file = `seed-avatar-${pid}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <text x="50%" y="54%" font-size="84" fill="#ffffff" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
  fs.writeFileSync(path.join(uploadsDir, file), svg);
  setPhoto.run(`/uploads/${file}`, pid);
});

function makePhoto(file, w, h, c1, c2, emoji, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${Math.min(w, h) * 0.28}" fill="#ffffff" opacity="0.10"/>
  <text x="50%" y="44%" font-size="${Math.min(w, h) * 0.36}" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="50%" y="76%" font-size="${Math.round(w * 0.05)}" fill="#ffffff" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">${label}</text>
</svg>`;
  fs.writeFileSync(path.join(uploadsDir, file), svg);
  return `/uploads/${file}`;
}

// Game & tournament action shots only — the highlight reel.
const PH = [
  // [file, w, h, c1, c2, emoji, label, caption, moment, eventId, favorite, uploaderRole, hoursAgo]
  ["seed-1.svg", 800, 600, "#22d3ee", "#2563eb", "🏐", "ACE", "Jump-serve ace to win the set", "Serving", gameEventIds[0], 1, "coach", 2],
  ["seed-2.svg", 680, 900, "#0ea5e9", "#1e3a8a", "💥", "KILL", "Cross-court kill on set point", "Hitting", gameEventIds[0], 1, "player", 6],
  ["seed-3.svg", 800, 600, "#38bdf8", "#1d4ed8", "🤿", "DIG", "Diving dig keeps the rally alive", "Digging", gameEventIds[1], 0, "coach", 11],
  ["seed-4.svg", 720, 760, "#3b82f6", "#0d1730", "🎯", "SET", "Perfect set to the pin", "Setting", gameEventIds[1], 1, "coach", 18],
  ["seed-5.svg", 680, 900, "#818cf8", "#1e3a8a", "💪", "ATTACK", "Back-row attack rips through", "Hitting", gameEventIds[2], 0, "player", 24],
  ["seed-6.svg", 820, 560, "#06b6d4", "#1e40af", "🎯", "SERVE", "Float serve drops in the seam", "Serving", gameEventIds[2], 1, "coach", 30],
  ["seed-7.svg", 800, 600, "#0284c7", "#172554", "🤿", "DIG", "Pancake save in the back row", "Digging", gameEventIds[0], 0, "coach", 38],
  ["seed-8.svg", 680, 900, "#2563eb", "#0d1730", "⚡", "SET", "Quick set to the middle", "Setting", gameEventIds[2], 0, "player", 46],
  ["seed-9.svg", 800, 560, "#38bdf8", "#1e40af", "💥", "KILL", "Line shot down the sideline", "Hitting", gameEventIds[1], 1, "coach", 54],
];

const insertMedia = db.prepare(
  `INSERT INTO media (url, caption, event_id, category, favorite, uploaded_by, uploader_role, ratio, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
);

const mediaIds = [];
for (const p of PH) {
  const [file, w, h, c1, c2, emoji, label, caption, moment, eventId, fav, role, hoursAgo] = p;
  const url = makePhoto(file, w, h, c1, c2, emoji, label);
  const uploaderId = role === "coach" ? coachId : playerIds[(hoursAgo % playerIds.length)];
  const info = insertMedia.run(url, caption, eventId || null, moment, fav, uploaderId, role, h / w, `-${hoursAgo} hours`);
  mediaIds.push(info.lastInsertRowid);
}

// Seed some likes (varied) so the highlight reel feels alive.
const insertLike = db.prepare("INSERT OR IGNORE INTO media_likes (media_id, user_id) VALUES (?, ?)");
mediaIds.forEach((mid, i) => {
  const likers = ((i * 3) % playerIds.length) + 1; // 1..N
  for (let k = 0; k < likers; k++) insertLike.run(mid, playerIds[k]);
});

// ---- announcements ----
const insertAnn = db.prepare(
  `INSERT INTO announcements (author_id, title, body, category, pinned) VALUES (?, ?, ?, ?, ?)`
);
insertAnn.run(coachId, "Senior Night vs. Oakmont 🎉", "Big home game in 3 days! Wear your home whites and arrive 60 min early for warmups. Let's pack the gym.", "announcement", 1);
insertAnn.run(coachId, "Core & shoulder prehab", "New 10-min routine before every practice: band external rotations 2x15, dead bugs 2x10/side, plank 3x30s. Protect those shoulders.", "exercise", 0);
insertAnn.run(coachId, "Tournament travel info", "Coastal Invitational bus leaves school at 7:30am sharp. Bring lunch, water, and extra knee pads.", "info", 0);

// ---- recommended exercises ----
const insertExercise = db.prepare(
  `INSERT INTO exercises (title, instructions, reps, difficulty, category, coach_notes, created_by)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const EXERCISES = [
  // [title, instructions, reps, difficulty, category, coach_notes]
  ["Wall bump passing", "Bump a volleyball against a wall 30 times in a row without letting it drop.", "30 in a row", "Beginner", "Skills", "Keep your platform flat and angled to the wall."],
  ["Wall setting", "Set a volleyball against a wall 30 times in a row, keeping a consistent rhythm.", "30 in a row", "Beginner", "Skills", "Hands in a triangle, push through the fingertips."],
  ["Wall hitting", "Hit a volleyball against a wall, focusing on a high contact point and snapping wrist.", "3 x 20", "Intermediate", "Skills", "Contact the ball at full extension."],
  ["Passing drills", "Partner passing focusing on platform control and footwork to the ball.", "4 x 10", "Beginner", "Skills", null],
  ["Serving accuracy", "Serve to targeted zones on the court (deep corners, short).", "5 x 6 serves", "Intermediate", "Skills", "Aim for zones 1 and 5."],
  ["Footwork ladder", "Agility-ladder footwork patterns for quick transitions.", "4 sets", "Beginner", "Conditioning", null],
  ["Jump training", "Box jumps and approach jumps to build explosive vertical.", "4 x 8", "Advanced", "Strength", "Land soft, knees over toes."],
  ["Conditioning circuit", "Suicides, shuttle runs, and burpees for match endurance.", "3 rounds", "Advanced", "Conditioning", null],
  ["Resistance band work", "Banded shoulder and hip activation series.", "2 x 15", "Beginner", "Strength", null],
  ["Shoulder strengthening", "External rotations, Y-T-W raises for shoulder stability.", "3 x 12", "Intermediate", "Injury Prevention", "Light weight, slow and controlled."],
  ["Injury prevention", "Ankle and knee stability work plus balance drills.", "10 min", "Beginner", "Injury Prevention", null],
  ["Warm-up & recovery", "Dynamic warm-up before, static stretch and foam roll after.", "10–15 min", "Beginner", "Recovery", "Never skip the cool-down."],
];
const exerciseIds = EXERCISES.map((e) => insertExercise.run(e[0], e[1], e[2], e[3], e[4], e[5], coachId).lastInsertRowid);

// some players have completed some exercises (varied progress)
const insertCompletion = db.prepare(
  "INSERT OR IGNORE INTO exercise_completions (exercise_id, user_id) VALUES (?, ?)"
);
playerIds.forEach((pid, i) => {
  // each player completes the first (i % 5) + 2 exercises
  const count = ((i % 5) + 2);
  for (let k = 0; k < count && k < exerciseIds.length; k++) {
    insertCompletion.run(exerciseIds[k], pid);
  }
});

// ---- coach notes on a couple of players ----
const insertNote = db.prepare("INSERT INTO player_notes (user_id, author_id, note) VALUES (?, ?, ?)");
insertNote.run(playerIds[0], coachId, "Elite court vision. Work on back-row attacking to add a dimension.");
insertNote.run(playerIds[0], coachId, "Watch the shoulder load on serving days — manage reps.");
insertNote.run(playerIds[2], coachId, "Most consistent attacker on the team. Ready for a leadership role.");

// ---- wellness kit inventory ----
const insertKitItem = db.prepare(
  "INSERT INTO wellness_kit_items (team_id, item_name, quantity, sort_order, updated_by) VALUES (?, ?, ?, ?, ?)"
);
const KIT_ITEMS = [
  ["Athletic tape", "6 rolls"],
  ["Stretch bands", "4 sets"],
  ["Ice packs", "12"],
  ["Foam rollers", "2"],
  ["Electrolyte packets", "24"],
  ["Ankle braces", "4"],
  ["Heat packs", "8"],
  ["Massage balls", "3"],
  ["Knee sleeves", "6"],
  ["Blister care kit", "1"],
];
KIT_ITEMS.forEach(([name, qty], i) => insertKitItem.run(teamId, name, qty, i, coachId));

// ---- player wellness kit suggestions ----
const insertKitSuggestion = db.prepare(
  "INSERT INTO wellness_kit_suggestions (user_id, suggestion) VALUES (?, ?)"
);
const KIT_SUGGESTIONS = [
  [playerIds[0], "Portable massage gun for away tournaments"],
  [playerIds[1], "Cooling towels for hot gyms"],
  [playerIds[2], "Extra pre-wrap rolls"],
  [playerIds[3], "Compression socks (medium)"],
  [playerIds[4], "Muscle balm / tiger balm"],
  [playerIds[5], "Grip tape for sweaty hands"],
  [playerIds[6], "Resistance loop bands (heavy)"],
  [playerIds[7], "Instant cold packs for travel"],
];
KIT_SUGGESTIONS.forEach(([uid, text]) => insertKitSuggestion.run(uid, text));

// Link coach and players to the volleyball sport hub.
const linkSport = db.prepare(
  `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'volleyball', ?)
   ON CONFLICT(user_id, sport) DO UPDATE SET team_id = excluded.team_id`
);
linkSport.run(coachId, teamId);
for (const pid of playerIds) linkSport.run(pid, teamId);

console.log("✅ Seeded RallyHQ:");
console.log(`   1 coach, ${players.length} players`);
console.log(`   ${gameEventIds.length} past games + practices + upcoming events`);
console.log("   5 team bonding events (dinners, beach day, outing, celebration)");
console.log("   6 days of check-ins (with soreness/energy/injury trends)");
console.log("   post-game wellness for the latest game (2 players need rest)");
console.log("   9 game/tournament action shots (+ likes) + player avatars");
console.log("   12 recommended exercises + completions");
console.log("   10 wellness kit items + 8 player suggestions");
console.log("   3 announcements + coach notes\n");
console.log("Demo logins (password: password123):");
console.log("   Coach : coach@rallyhq.dev");
console.log("   Player: maya@rallyhq.dev");
