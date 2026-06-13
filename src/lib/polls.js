import { getDb } from "./db";
import { contentTeamExpr } from "./teamScope";

/** Team id for a poll via its author. */
export function pollTeamId(pollId) {
  return getDb()
    .prepare(
      `SELECT ${contentTeamExpr("p", "author_id")} AS team_id FROM polls p WHERE p.id = ?`
    )
    .get(Number(pollId))?.team_id;
}

/** Create a poll with 2–5 choices. */
export function createPoll({ authorId, teamId, question, choices, pinned = false }) {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO polls (author_id, question, pinned, team_id) VALUES (?, ?, ?, ?)`
      )
      .run(authorId, question.trim(), pinned ? 1 : 0, teamId || null);
    const pollId = info.lastInsertRowid;
    const insert = db.prepare(
      `INSERT INTO poll_options (poll_id, label, sort_order) VALUES (?, ?, ?)`
    );
    choices.forEach((label, i) => insert.run(pollId, label.trim(), i));
    return pollId;
  });
  return tx();
}

function optionRows(pollId) {
  return getDb()
    .prepare(
      `SELECT id, label, sort_order FROM poll_options WHERE poll_id = ? ORDER BY sort_order ASC`
    )
    .all(pollId);
}

function voteCounts(pollId) {
  const rows = getDb()
    .prepare(
      `SELECT option_id, COUNT(*) AS n FROM poll_votes WHERE poll_id = ? GROUP BY option_id`
    )
    .all(pollId);
  const map = {};
  for (const r of rows) map[r.option_id] = r.n;
  return map;
}

/** Poll with options, vote counts, and optional viewer vote. */
export function getPollDetail(pollId, viewerId = null) {
  const poll = getDb()
    .prepare(
      `SELECT p.*, u.name AS author FROM polls p JOIN users u ON u.id = p.author_id WHERE p.id = ?`
    )
    .get(Number(pollId));
  if (!poll) return null;

  const counts = voteCounts(pollId);
  const options = optionRows(pollId).map((o) => ({
    id: o.id,
    label: o.label,
    votes: counts[o.id] || 0,
  }));
  const totalVotes = options.reduce((s, o) => s + o.votes, 0);

  let myVote = null;
  if (viewerId) {
    myVote = getDb()
      .prepare(
        `SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?`
      )
      .get(pollId, viewerId)?.option_id;
  }

  return { ...poll, options, totalVotes, myVote };
}

/** Team polls for the announcements feed. */
export function listTeamPolls(teamId) {
  return getDb()
    .prepare(
      `SELECT p.*, u.name AS author FROM polls p
       JOIN users u ON u.id = p.author_id
       WHERE ${contentTeamExpr("p", "author_id")} = ?
       ORDER BY p.pinned DESC, p.created_at DESC
       LIMIT 50`
    )
    .all(teamId);
}

/** Cast a vote — one per user per poll. Returns false if already voted. */
export function castVote(pollId, userId, optionId) {
  const db = getDb();
  const option = db
    .prepare(`SELECT id FROM poll_options WHERE id = ? AND poll_id = ?`)
    .get(optionId, pollId);
  if (!option) return { ok: false, error: "Invalid choice." };

  const existing = db
    .prepare(`SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?`)
    .get(pollId, userId);
  if (existing) return { ok: false, error: "You already voted." };

  db.prepare(
    `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)`
  ).run(pollId, optionId, userId);

  return { ok: true };
}
