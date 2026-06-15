// Idempotent demo rosters for volleyball, basketball, and soccer.
// Run with: npm run seed:all
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
   ON CONFLICT(user_id, sport) DO UPDATE SET team_id = excluded.team_id`
);
const insertEvent = db.prepare(
  `INSERT INTO events (type, title, opponent, location, start_time, end_time, created_by, team_id)
   VALUES (?, ?, ?, ?, datetime('now', ?), datetime('now', ?), ?, ?)`
);
const insertResult = db.prepare(
  `INSERT INTO game_results (event_id, our_score, opp_score, result, sets_json) VALUES (?, ?, ?, ?, ?)`
);
const insertStat = db.prepare(
  `INSERT OR IGNORE INTO player_stats (event_id, user_id, recorded_by, kills, hits, assists, aces, digs, blocks, errors, service_receptions, interceptions, def_blocks, yellow_cards, red_cards)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

function ensureTeam(name, code, sport) {
  let team = db.prepare("SELECT id, sport FROM teams WHERE code = ?").get(code);
  if (!team) {
    const info = db.prepare("INSERT INTO teams (name, code, sport) VALUES (?, ?, ?)").run(name, code, sport);
    team = { id: info.lastInsertRowid, sport };
  } else if (team.sport !== sport) {
    db.prepare("UPDATE teams SET sport = ?, name = ? WHERE id = ?").run(sport, name, team.id);
    team.sport = sport;
  }
  return team.id;
}

function seedRoster(teamId, sport, players) {
  const ids = [];
  for (const [name, email, position, jersey, height, bio] of players) {
    let row = db.prepare("SELECT id, team_id FROM users WHERE email = ?").get(email);
    if (!row) {
      const id = insertUser.run(name, email, hash, teamId, position, jersey, height, bio).lastInsertRowid;
      linkSport.run(id, sport, teamId);
      ids.push(id);
      continue;
    }
    db.prepare(
      "UPDATE users SET team_id = ?, position = ?, jersey_number = ?, height_cm = ?, bio = ? WHERE id = ?"
    ).run(teamId, position, jersey, height, bio, row.id);
    linkSport.run(row.id, sport, teamId);
    ids.push(row.id);
  }
  return ids;
}

function buildStatRow(base, gi, i) {
  const j = gi + i;
  return {
    kills: Math.max(0, base.kills + ((j % 5) - 2)),
    hits: Math.max(0, base.hits + ((j % 4) - 1)),
    assists: Math.max(0, base.assists + (j % 3)),
    aces: Math.max(0, base.aces + (j % 2)),
    digs: Math.max(0, base.digs + ((j % 3) - 1)),
    blocks: Math.max(0, base.blocks + (j % 2)),
    errors: Math.max(0, base.errors + (j % 2)),
    service_receptions: Math.max(0, base.service_receptions ?? 0),
    interceptions: Math.max(0, base.interceptions ?? 0),
    def_blocks: Math.max(0, base.def_blocks ?? 0),
    yellow_cards: Math.max(0, base.yellow_cards ?? 0),
    red_cards: Math.max(0, base.red_cards ?? 0),
  };
}

function insertStatsForEvent(eventId, playerIds, coachId, profiles, gi) {
  let added = 0;
  playerIds.forEach((pid, i) => {
    const row = buildStatRow(profiles[i % profiles.length], gi, i);
    const info = insertStat.run(
      eventId,
      pid,
      coachId,
      row.kills,
      row.hits,
      row.assists,
      row.aces,
      row.digs,
      row.blocks,
      row.errors,
      row.service_receptions,
      row.interceptions,
      row.def_blocks,
      row.yellow_cards,
      row.red_cards
    );
    if (info.changes) added++;
  });
  return added;
}

function ensureGameResult(eventId, sport, gi) {
  const existing = db.prepare("SELECT 1 FROM game_results WHERE event_id = ?").get(eventId);
  if (existing) return;
  const ours = gi % 2 === 0 ? 3 : 1;
  const theirs = gi % 2 === 0 ? 1 : 2;
  insertResult.run(
    eventId,
    sport === "basketball" ? (gi % 2 === 0 ? 68 : 54) : sport === "soccer" ? ours : ours,
    sport === "basketball" ? (gi % 2 === 0 ? 61 : 58) : sport === "soccer" ? theirs : theirs,
    gi % 2 === 0 ? "W" : "L",
    sport === "volleyball" ? JSON.stringify([[25, 18], [25, 20], [25, 22]]) : "[]"
  );
}

function backfillGameStats(teamId, sport, playerIds, coachId, profiles) {
  if (!coachId || !playerIds.length) return 0;
  const events = db
    .prepare(
      `SELECT id FROM events WHERE team_id = ? AND type IN ('game', 'tournament') ORDER BY id`
    )
    .all(teamId);
  let added = 0;
  events.forEach((ev, gi) => {
    ensureGameResult(ev.id, sport, gi);
    added += insertStatsForEvent(ev.id, playerIds, coachId, profiles, gi);
  });
  return added;
}

function seedGames(teamId, sport, playerIds, coachId, opponents, profiles) {
  if (!coachId || !playerIds.length) return 0;
  const existing = db
    .prepare("SELECT COUNT(*) AS c FROM events WHERE team_id = ? AND type IN ('game', 'tournament')")
    .get(teamId).c;
  if (existing >= opponents.length) return 0;

  opponents.forEach((opp, gi) => {
    const eventId = insertEvent.run(
      gi === 0 ? "game" : "game",
      `vs. ${opp}`,
      opp,
      sport === "soccer" ? "Home Field" : "Home Gym",
      `-${21 - gi * 7} days`,
      `-${21 - gi * 7} days +2 hours`,
      coachId,
      teamId
    ).lastInsertRowid;

    const ours = gi % 2 === 0 ? 3 : 1;
    const theirs = gi % 2 === 0 ? 1 : 2;
    ensureGameResult(eventId, sport, gi);
    insertStatsForEvent(eventId, playerIds, coachId, profiles, gi);
  });
  return opponents.length;
}

const volleyballPlayers = [
  ["Maya Chen", "maya@rallyhq.dev", "Setter", 7, 175, "Quarterback of the offense. Loves a quick tempo."],
  ["Sofia Reyes", "sofia@rallyhq.dev", "Libero", 3, 168, "Defensive anchor. Never lets a ball drop."],
  ["Jordan Blake", "jordan@rallyhq.dev", "Outside Hitter", 11, 182, "Go-to attacker in big moments."],
  ["Ava Thompson", "ava@rallyhq.dev", "Middle Blocker", 14, 188, "Wall at the net."],
  ["Lena Müller", "lena@rallyhq.dev", "Opposite", 9, 184, "Big right-side swing."],
  ["Priya Nair", "priya@rallyhq.dev", "Outside Hitter", 6, 178, "All-around six-rotation player."],
  ["Zoe Adams", "zoe@rallyhq.dev", "Middle Blocker", 12, 186, "Quick slides and stuff blocks."],
  ["Nina Costa", "nina@rallyhq.dev", "Defensive Specialist", 4, 170, "Serve-receive specialist."],
];

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

const volleyballProfiles = [
  { kills: 14, hits: 6, assists: 32, aces: 4, digs: 18, blocks: 3, errors: 2 },
  { kills: 2, hits: 1, assists: 4, aces: 1, digs: 42, blocks: 0, errors: 1 },
  { kills: 22, hits: 9, assists: 2, aces: 3, digs: 12, blocks: 2, errors: 4 },
  { kills: 16, hits: 7, assists: 1, aces: 2, digs: 8, blocks: 8, errors: 3 },
  { kills: 18, hits: 8, assists: 1, aces: 5, digs: 6, blocks: 4, errors: 2 },
  { kills: 15, hits: 6, assists: 3, aces: 2, digs: 14, blocks: 1, errors: 3 },
  { kills: 12, hits: 5, assists: 1, aces: 1, digs: 5, blocks: 6, errors: 2 },
  { kills: 4, hits: 2, assists: 2, aces: 2, digs: 28, blocks: 0, errors: 1 },
];

const basketballProfiles = [
  { kills: 18, digs: 8, assists: 5, errors: 3, aces: 2, blocks: 0, hits: 4 },
  { kills: 22, digs: 4, assists: 2, errors: 2, aces: 3, blocks: 0, hits: 3 },
  { kills: 14, digs: 6, assists: 3, errors: 4, aces: 2, blocks: 1, hits: 5 },
  { kills: 12, digs: 11, assists: 1, errors: 2, aces: 1, blocks: 2, hits: 4 },
  { kills: 18, digs: 14, assists: 1, errors: 3, aces: 1, blocks: 4, hits: 5 },
  { kills: 11, digs: 2, assists: 7, errors: 5, aces: 4, blocks: 0, hits: 2 },
  { kills: 15, digs: 3, assists: 2, errors: 2, aces: 2, blocks: 0, hits: 3 },
  { kills: 17, digs: 5, assists: 2, errors: 3, aces: 2, blocks: 1, hits: 4 },
];

const soccerProfiles = [
  { kills: 0, hits: 0, assists: 0, aces: 0, digs: 8, blocks: 0, errors: 0, service_receptions: 72, interceptions: 0, def_blocks: 0, yellow_cards: 0, red_cards: 0 },
  { kills: 0, hits: 2, assists: 0, aces: 1, digs: 0, blocks: 6, errors: 0, service_receptions: 88, interceptions: 4, def_blocks: 3, yellow_cards: 1, red_cards: 0 },
  { kills: 0, hits: 3, assists: 2, aces: 2, digs: 0, blocks: 5, errors: 0, service_receptions: 84, interceptions: 2, def_blocks: 2, yellow_cards: 0, red_cards: 0 },
  { kills: 0, hits: 2, assists: 1, aces: 1, digs: 0, blocks: 4, errors: 0, service_receptions: 81, interceptions: 3, def_blocks: 2, yellow_cards: 1, red_cards: 0 },
  { kills: 1, hits: 4, assists: 3, aces: 2, digs: 2, blocks: 7, errors: 0, service_receptions: 86, interceptions: 5, def_blocks: 1, yellow_cards: 2, red_cards: 0 },
  { kills: 2, hits: 5, assists: 4, aces: 3, digs: 1, blocks: 5, errors: 0, service_receptions: 90, interceptions: 3, def_blocks: 1, yellow_cards: 1, red_cards: 0 },
  { kills: 1, hits: 6, assists: 5, aces: 4, digs: 0, blocks: 3, errors: 0, service_receptions: 78, interceptions: 1, def_blocks: 0, yellow_cards: 0, red_cards: 0 },
  { kills: 3, hits: 7, assists: 1, aces: 5, digs: 0, blocks: 2, errors: 0, service_receptions: 0, interceptions: 0, def_blocks: 0, yellow_cards: 1, red_cards: 0 },
];

const vballTeamId = ensureTeam("RallyHQ Demo", "DEMO01", "volleyball");
const bballTeamId = ensureTeam("RallyHQ Basketball", "BBALL01", "basketball");
const soccerTeamId = ensureTeam("RallyHQ Soccer", "SOC01", "soccer");

const coach = db.prepare("SELECT id FROM users WHERE email = 'coach@rallyhq.dev'").get();
let coachId = coach?.id;
if (!coachId) {
  coachId = db.prepare("SELECT id FROM users WHERE role = 'coach' ORDER BY id LIMIT 1").get()?.id;
}

if (coachId) {
  linkSport.run(coachId, "volleyball", vballTeamId);
  linkSport.run(coachId, "basketball", bballTeamId);
  linkSport.run(coachId, "soccer", soccerTeamId);
  // Coaches linked to demo rosters get all-sports access (sport picker + all teams).
  db.prepare(
    `UPDATE users SET sport_preference = 'all' WHERE id = ? AND role = 'coach'`
  ).run(coachId);
}

// Coaches → demo teams per sport so each hub has its own example roster.
const coaches = db.prepare("SELECT id FROM users WHERE role = 'coach'").all();
for (const { id } of coaches) {
  for (const [sport, teamId] of [
    ["volleyball", vballTeamId],
    ["basketball", bballTeamId],
    ["soccer", soccerTeamId],
  ]) {
    linkSport.run(id, sport, teamId);
  }
  db.prepare(`UPDATE users SET sport_preference = 'all' WHERE id = ?`).run(id);
}

const vballIds = seedRoster(vballTeamId, "volleyball", volleyballPlayers);
const bballIds = seedRoster(bballTeamId, "basketball", basketballPlayers);
const soccerIds = seedRoster(soccerTeamId, "soccer", soccerPlayers);

// Keep demo logins working after re-seed.
db.prepare(
  `UPDATE users SET password_hash = ? WHERE role = 'player' AND lower(email) LIKE '%@rallyhq.dev'`
).run(hash);

const gamesAdded =
  seedGames(vballTeamId, "volleyball", vballIds, coachId, ["Lincoln High", "Westfield Prep", "Riverside"], volleyballProfiles) +
  seedGames(bballTeamId, "basketball", bballIds, coachId, ["Central High", "Westside Prep", "Oak Park Academy"], basketballProfiles) +
  seedGames(soccerTeamId, "soccer", soccerIds, coachId, ["Riverside FC", "Lakeview United", "Northside SC"], soccerProfiles);

const statsAdded =
  backfillGameStats(vballTeamId, "volleyball", vballIds, coachId, volleyballProfiles) +
  backfillGameStats(bballTeamId, "basketball", bballIds, coachId, basketballProfiles) +
  backfillGameStats(soccerTeamId, "soccer", soccerIds, coachId, soccerProfiles);

console.log("✅ Example players ready for all sports:");
console.log(`   🏐 Volleyball (DEMO01): ${vballIds.length} players`);
console.log(`   🏀 Basketball (BBALL01): ${bballIds.length} players`);
console.log(`   ⚽ Soccer (SOC01): ${soccerIds.length} players`);
if (gamesAdded) console.log(`   Added ${gamesAdded} new demo game(s)`);
if (statsAdded) console.log(`   Added ${statsAdded} player stat row(s) across all games`);
console.log("   Demo password for all players: password123");
if (coachId) {
  const coachEmail = db.prepare("SELECT email FROM users WHERE id = ?").get(coachId)?.email;
  console.log(`   Games/stats recorded by coach: ${coachEmail || coachId}`);
}
