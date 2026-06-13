// Add separate basketball and soccer rosters to an existing RallyHQ database.
// Run with: node scripts/seed-sport-rosters.mjs
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/db.js";

const db = getDb();
const hash = bcrypt.hashSync("password123", 10);

const insertUser = db.prepare(
  `INSERT INTO users (name, email, password_hash, role, team_id, position, jersey_number, height_cm, bio)
   VALUES (?, ?, ?, 'player', ?, ?, ?, ?, ?)`
);
const linkSport = db.prepare(
  `INSERT INTO user_sport_teams (user_id, sport, team_id) VALUES (?, ?, ?)
   ON CONFLICT(user_id, sport) DO NOTHING`
);

function ensureTeam(name, code, sport) {
  let team = db.prepare("SELECT id FROM teams WHERE code = ?").get(code);
  if (!team) {
    const info = db.prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)").run(name, code, sport);
    team = { id: info.lastInsertRowid };
  }
  return team.id;
}

function seedRoster(teamId, sport, players) {
  const ids = [];
  for (const [name, email, position, jersey, height, bio] of players) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = insertUser.run(name, email, hash, teamId, position, jersey, height, bio).lastInsertRowid;
    linkSport.run(id, sport, teamId);
    ids.push(id);
  }
  return ids;
}

const bballTeamId = ensureTeam("RallyHQ Basketball", "BBALL01", "basketball");
const soccerTeamId = ensureTeam("RallyHQ Soccer", "SOC01", "soccer");

const coach = db.prepare("SELECT id FROM users WHERE email = 'coach@rallyhq.dev'").get();
if (coach) {
  linkSport.run(coach.id, "basketball", bballTeamId);
  linkSport.run(coach.id, "soccer", soccerTeamId);
}

const basketballPlayers = [
  ["Marcus Webb", "marcus.bb@rallyhq.dev", "Point Guard", 1, 183, "Floor general — pushes pace in transition."],
  ["Tyler Brooks", "tyler.bb@rallyhq.dev", "Shooting Guard", 23, 191, "Catch-and-shoot threat from deep."],
  ["Ethan Cole", "ethan.bb@rallyhq.dev", "Small Forward", 5, 198, "Versatile wing who guards multiple positions."],
  ["Jaylen Hart", "jaylen.bb@rallyhq.dev", "Power Forward", 44, 203, "High-energy rebounder and rim runner."],
  ["Devon Price", "devon.bb@rallyhq.dev", "Center", 32, 211, "Anchor in the paint on both ends."],
  ["Ryan Kim", "ryan.bb@rallyhq.dev", "Point Guard", 10, 180, "Quick hands — leads the team in steals."],
  ["Cole Rivera", "cole.bb@rallyhq.dev", "Shooting Guard", 3, 188, "Relentless cutter and mid-range scorer."],
  ["Amir Okafor", "amir.bb@rallyhq.dev", "Small Forward", 21, 195, "Slasher who gets to the free-throw line."],
];

const soccerPlayers = [
  ["Leo Martinez", "leo.sc@rallyhq.dev", "Goalkeeper", 1, 188, "Commanding presence — organizes the back line."],
  ["Hannah Bell", "hannah.sc@rallyhq.dev", "Center Back", 4, 175, "Wins aerial duels and starts the build-out."],
  ["Kai Nakamura", "kai.sc@rallyhq.dev", "Full Back", 3, 178, "Overlapping runs and precise crosses."],
  ["Emma Ross", "emma.sc@rallyhq.dev", "Full Back", 2, 170, "Tenacious defender with great recovery speed."],
  ["Omar Farid", "omar.sc@rallyhq.dev", "Defensive Mid", 6, 182, "Shield in front of the back four."],
  ["Imani Clarke", "imani.sc@rallyhq.dev", "Central Mid", 8, 168, "Box-to-box engine — links defense to attack."],
  ["Jules Blanc", "jules.sc@rallyhq.dev", "Winger", 11, 177, "Beats defenders on the flank and delivers service."],
  ["Noah Patel", "noah.sc@rallyhq.dev", "Striker", 9, 185, "Clinical finisher in the final third."],
];

const bballIds = seedRoster(bballTeamId, "basketball", basketballPlayers);
const soccerIds = seedRoster(soccerTeamId, "soccer", soccerPlayers);

// ---- sample game stats for basketball & soccer ----
const coachId = coach?.id;
const insertEvent = db.prepare(
  `INSERT INTO events (type, title, opponent, location, start_time, end_time, created_by, team_id)
   VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?, ?)`
);
const insertResult = db.prepare(
  `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json) VALUES (?, ?, ?, ?, ?)`
);
const insertStat = db.prepare(
  `INSERT OR IGNORE INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

function seedSportGames(teamId, sport, playerIds, opponents, profiles) {
  if (!coachId || !playerIds.length) return;
  const existing = db
    .prepare(
      `SELECT COUNT(*) AS c FROM events WHERE team_id = ? AND type = 'game'`
    )
    .get(teamId).c;
  if (existing >= 2) return;

  opponents.forEach((opp, gi) => {
    const eventId = insertEvent.run(
      "game",
      `vs. ${opp}`,
      opp,
      "Home Gym",
      `-${14 - gi * 7} days`,
      `-${14 - gi * 7} days +2 hours`,
      coachId,
      teamId
    ).lastInsertRowid;
    insertResult.run(eventId, gi === 0 ? 72 : 58, gi === 0 ? 65 : 61, gi === 0 ? "W" : "L", "[]");

    playerIds.forEach((pid, i) => {
      const base = profiles[i % profiles.length];
      const j = gi + i;
      insertStat.run(
        eventId,
        pid,
        coachId,
        Math.max(0, base.kills + ((j % 5) - 2)),
        Math.max(0, base.hits + ((j % 4) - 1)),
        Math.max(0, base.assists + (j % 3)),
        Math.max(0, base.aces + (j % 2)),
        Math.max(0, base.digs + ((j % 3) - 1)),
        Math.max(0, base.blocks + (j % 2)),
        Math.max(0, base.errors + (j % 2))
      );
    });
  });
}

const bballProfiles = [
  { kills: 18, hits: 7, assists: 6, aces: 3, digs: 4, blocks: 0, errors: 2 },
  { kills: 14, hits: 6, assists: 2, aces: 2, digs: 3, blocks: 1, errors: 3 },
  { kills: 12, hits: 5, assists: 3, aces: 2, digs: 6, blocks: 1, errors: 2 },
  { kills: 10, hits: 4, assists: 1, aces: 1, digs: 8, blocks: 2, errors: 2 },
  { kills: 16, hits: 6, assists: 1, aces: 1, digs: 10, blocks: 3, errors: 3 },
  { kills: 11, hits: 4, assists: 7, aces: 4, digs: 2, blocks: 0, errors: 2 },
  { kills: 13, hits: 5, assists: 2, aces: 2, digs: 3, blocks: 0, errors: 2 },
  { kills: 15, hits: 6, assists: 2, aces: 2, digs: 5, blocks: 1, errors: 2 },
];

const soccerProfiles = [
  { kills: 0, hits: 0, assists: 0, aces: 0, digs: 8, blocks: 0, errors: 0 },
  { kills: 0, hits: 1, assists: 0, aces: 0, digs: 0, blocks: 5, errors: 1 },
  { kills: 0, hits: 2, assists: 1, aces: 0, digs: 0, blocks: 4, errors: 0 },
  { kills: 0, hits: 1, assists: 2, aces: 0, digs: 0, blocks: 3, errors: 0 },
  { kills: 1, hits: 3, assists: 2, aces: 0, digs: 2, blocks: 6, errors: 1 },
  { kills: 2, hits: 4, assists: 3, aces: 0, digs: 1, blocks: 4, errors: 1 },
  { kills: 1, hits: 5, assists: 4, aces: 0, digs: 0, blocks: 2, errors: 2 },
  { kills: 3, hits: 6, assists: 1, aces: 0, digs: 0, blocks: 1, errors: 2 },
];

seedSportGames(bballTeamId, "basketball", bballIds, ["Central High", "Westside Prep"], bballProfiles);
seedSportGames(soccerTeamId, "soccer", soccerIds, ["Riverside FC", "Lakeview United"], soccerProfiles);

console.log(`✅ Basketball roster: ${bballIds.length} players on team ${bballTeamId}`);
console.log(`✅ Soccer roster: ${soccerIds.length} players on team ${soccerTeamId}`);
console.log("   Demo game stats seeded for basketball & soccer");
console.log("   Demo password for new players: password123");
