// Rich basketball demo: 8 players, 4 past games with stats, practices, check-ins.
// Run with: npm run seed:basketball
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const db = getDb();
const hash = bcrypt.hashSync("password123", 10);

const PLAYERS = [
  ["Marcus Webb", "marcus.bb@rallyhq.dev", "Point Guard", 1, 183, "Floor general — pushes pace in transition."],
  ["Tyler Brooks", "tyler.bb@rallyhq.dev", "Shooting Guard", 23, 191, "Catch-and-shoot threat from deep."],
  ["Ethan Cole", "ethan.bb@rallyhq.dev", "Small Forward", 5, 198, "Versatile wing who guards multiple positions."],
  ["Jaylen Hart", "jaylen.bb@rallyhq.dev", "Power Forward", 44, 203, "High-energy rebounder and rim runner."],
  ["Devon Price", "devon.bb@rallyhq.dev", "Center", 32, 211, "Anchor in the paint on both ends."],
  ["Ryan Kim", "ryan.bb@rallyhq.dev", "Point Guard", 10, 180, "Quick hands — leads the team in steals."],
  ["Cole Rivera", "cole.bb@rallyhq.dev", "Shooting Guard", 3, 188, "Relentless cutter and mid-range scorer."],
  ["Amir Okafor", "amir.bb@rallyhq.dev", "Small Forward", 21, 195, "Slasher who gets to the free-throw line."],
];

// kills=Points, hits=FG made, assists, aces=Steals, digs=Rebounds, blocks
const PROFILES = [
  { kills: 16, hits: 6, assists: 8, aces: 3, digs: 3, blocks: 0, errors: 2 }, // PG Marcus
  { kills: 22, hits: 8, assists: 2, aces: 2, digs: 4, blocks: 0, errors: 3 }, // SG Tyler
  { kills: 14, hits: 5, assists: 3, aces: 2, digs: 6, blocks: 1, errors: 2 }, // SF Ethan
  { kills: 12, hits: 5, assists: 1, aces: 1, digs: 11, blocks: 2, errors: 2 }, // PF Jaylen
  { kills: 18, hits: 7, assists: 1, aces: 1, digs: 14, blocks: 4, errors: 3 }, // C Devon
  { kills: 11, hits: 4, assists: 7, aces: 4, digs: 2, blocks: 0, errors: 2 }, // PG Ryan
  { kills: 15, hits: 6, assists: 2, aces: 2, digs: 3, blocks: 0, errors: 2 }, // SG Cole
  { kills: 17, hits: 6, assists: 2, aces: 2, digs: 5, blocks: 1, errors: 2 }, // SF Amir
];

const GAMES = [
  { opp: "Central High", daysAgo: 21, ours: 68, theirs: 61, result: "W" },
  { opp: "Westside Prep", daysAgo: 14, ours: 54, theirs: 58, result: "L" },
  { opp: "Oak Park Academy", daysAgo: 7, ours: 71, theirs: 65, result: "W" },
  { opp: "Riverside HS", daysAgo: 3, ours: 62, theirs: 59, result: "W" },
];

function ensureTeam() {
  let team = db.prepare("SELECT id FROM teams WHERE code = 'BBALL01'").get();
  if (!team) {
    const info = db
      .prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)")
      .run("RallyHQ Basketball", "BBALL01", "basketball");
    team = { id: info.lastInsertRowid };
  }
  return team.id;
}

function ensurePlayers(teamId) {
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, team_id, position, jersey_number, height_cm, bio)
     VALUES (?, ?, ?, 'player', ?, ?, ?, ?, ?)`
  );
  const linkSport = db.prepare(
    `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'basketball', ?)
     ON CONFLICT(user_id, sport) DO NOTHING`
  );
  const ids = [];
  for (const [name, email, position, jersey, height, bio] of PLAYERS) {
    let row = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!row) {
      const id = insertUser.run(name, email, hash, teamId, position, jersey, height, bio).lastInsertRowid;
      linkSport.run(id, teamId);
      row = { id };
    } else {
      db.prepare("UPDATE users SET team_id = ?, position = ?, jersey_number = ?, height_cm = ?, bio = ? WHERE id = ?")
        .run(teamId, position, jersey, height, bio, row.id);
      linkSport.run(row.id, teamId);
    }
    ids.push(row.id);
  }
  return ids;
}

const teamId = ensureTeam();
const playerIds = ensurePlayers(teamId);

const coach = db.prepare("SELECT id FROM users WHERE email = 'coach@rallyhq.dev'").get();
if (coach) {
  db.prepare(
    `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, 'basketball', ?)
     ON CONFLICT(user_id, sport) DO UPDATE SET team_id = excluded.team_id`
  ).run(coach.id, teamId);
}

// Reset basketball game data so re-runs refresh stats.
const oldEvents = db.prepare("SELECT id FROM events WHERE team_id = ?").all(teamId).map((r) => r.id);
if (oldEvents.length) {
  const ph = oldEvents.map(() => "?").join(",");
  db.prepare(`DELETE FROM player_stats WHERE event_id IN (${ph})`).run(...oldEvents);
  db.prepare(`DELETE FROM game_results WHERE event_id IN (${ph})`).run(...oldEvents);
  db.prepare(`DELETE FROM attendance WHERE event_id IN (${ph})`).run(...oldEvents);
  db.prepare(`DELETE FROM events WHERE id IN (${ph})`).run(...oldEvents);
}

const insertEvent = db.prepare(
  `INSERT INTO events (type, title, opponent, location, start_time, end_time, created_by, team_id)
   VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?, ?)`
);
const insertResult = db.prepare(
  `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json) VALUES (?, ?, ?, ?, ?)`
);
const insertStat = db.prepare(
  `INSERT INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertCheckin = db.prepare(
  `INSERT OR IGNORE INTO checkins (user_id, date, soreness, energy, mood, injury, sore_areas, note)
   VALUES (?, date('now', ?), ?, ?, ?, ?, ?, ?)`
);

const recorder = coach?.id ?? playerIds[0];

for (const g of GAMES) {
  const offset = `-${g.daysAgo} days`;
  const eventId = insertEvent.run(
    "game",
    `vs. ${g.opp}`,
    g.opp,
    "Main Gym",
    offset,
    `${offset} +2 hours`,
    recorder,
    teamId
  ).lastInsertRowid;
  insertResult.run(eventId, g.ours, g.theirs, g.result, "[]");

  playerIds.forEach((pid, i) => {
    const base = PROFILES[i];
    const jitter = g.daysAgo % 3;
    insertStat.run(
      eventId,
      pid,
      recorder,
      Math.max(0, base.kills + (jitter - 1)),
      Math.max(0, base.hits + (jitter % 2)),
      Math.max(0, base.assists + (i % 2)),
      Math.max(0, base.aces + (jitter % 2)),
      Math.max(0, base.digs + (jitter % 3)),
      Math.max(0, base.blocks + (i % 2)),
      Math.max(0, base.errors + (jitter % 2))
    );
  });
}

// Upcoming practice + game
insertEvent.run(
  "practice",
  "Shootaround",
  null,
  "Main Gym",
  "+1 days",
  "+1 days +90 minutes",
  recorder,
  teamId
);
insertEvent.run(
  "game",
  "vs. Metro City",
  "Metro City",
  "Away Gym",
  "+4 days",
  "+4 days +2 hours",
  recorder,
  teamId
);

// Sample wellness check-ins for a few players
const checkinProfiles = [
  [0, "-2 days", 2, 4, 4, 0, "", "Feeling good after the win"],
  [0, "-1 days", 3, 4, 4, 0, "Knee", "Light soreness after practice"],
  [1, "-2 days", 2, 5, 5, 0, "", "Great energy"],
  [4, "-1 days", 3, 3, 4, 0, "Back", "Tight lower back"],
];
for (const [idx, dateOff, sore, energy, mood, injury, areas, note] of checkinProfiles) {
  insertCheckin.run(playerIds[idx], dateOff, sore, energy, mood, injury, areas || null, note || null);
}

console.log("✅ Basketball demo seeded:");
console.log(`   Team: RallyHQ Basketball (BBALL01) — id ${teamId}`);
console.log(`   ${playerIds.length} players with season stats across ${GAMES.length} games`);
console.log("   Upcoming practice + game added");
console.log("   Demo logins (password: password123):");
console.log("   Coach : coach@rallyhq.dev");
console.log("   Player: marcus.bb@rallyhq.dev");
