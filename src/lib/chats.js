import { getDb } from "./db";

const MEMBER_COLS = `u.id, u.name, u.role, u.jersey_number`;

/** Rooms the user belongs to, newest activity first. */
export function listRoomsForUser(userId) {
  return getDb()
    .prepare(
      `SELECT r.id, r.name, r.team_id, r.created_by, r.created_at,
         (SELECT body FROM chat_messages WHERE room_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_body,
         (SELECT created_at FROM chat_messages WHERE room_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_at,
         (SELECT COUNT(*) FROM chat_members WHERE room_id = r.id) AS member_count
       FROM chat_rooms r
       JOIN chat_members m ON m.room_id = r.id AND m.user_id = ?
       ORDER BY COALESCE(last_at, r.created_at) DESC`
    )
    .all(userId);
}

export function isRoomMember(roomId, userId) {
  return !!getDb()
    .prepare("SELECT 1 FROM chat_members WHERE room_id = ? AND user_id = ?")
    .get(roomId, userId);
}

export function getRoomTeamId(roomId) {
  return getDb().prepare("SELECT team_id FROM chat_rooms WHERE id = ?").get(Number(roomId))?.team_id;
}

export function getRoomMembers(roomId) {
  return getDb()
    .prepare(
      `SELECT ${MEMBER_COLS} FROM chat_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.room_id = ? ORDER BY u.name`
    )
    .all(roomId);
}

export function getRoom(roomId) {
  return getDb().prepare("SELECT * FROM chat_rooms WHERE id = ?").get(Number(roomId));
}

/** Coaches and players on a team — eligible for group chats. */
export function chatEligibleUsers(teamId) {
  return getDb()
    .prepare(
      `SELECT id, name, role, jersey_number, position FROM users
       WHERE team_id = ? AND role IN ('coach', 'player') ORDER BY name`
    )
    .all(teamId);
}

export function validateInvitees(teamId, userIds, excludeIds = []) {
  if (!userIds?.length) return [];
  const exclude = new Set(excludeIds);
  const ids = [...new Set(userIds.map(Number).filter((id) => id && !exclude.has(id)))];
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `SELECT id FROM users WHERE team_id = ? AND role IN ('coach', 'player') AND id IN (${placeholders})`
    )
    .all(teamId, ...ids);
  return rows.map((r) => r.id);
}

export function createRoom({ teamId, creatorId, name, memberIds }) {
  const db = getDb();
  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Group name is required." };

  const invitees = validateInvitees(teamId, memberIds, [creatorId]);
  const tx = db.transaction(() => {
    const info = db
      .prepare("INSERT INTO chat_rooms (team_id, name, created_by) VALUES (?, ?, ?)")
      .run(teamId, trimmed, creatorId);
    const roomId = info.lastInsertRowid;
    const insert = db.prepare("INSERT OR IGNORE INTO chat_members (room_id, user_id) VALUES (?, ?)");
    insert.run(roomId, creatorId);
    for (const uid of invitees) insert.run(roomId, uid);
    return roomId;
  });
  return { roomId: tx() };
}

export function addRoomMembers(roomId, inviterId, memberIds) {
  const room = getRoom(roomId);
  if (!room) return { error: "Chat not found." };
  if (!isRoomMember(roomId, inviterId)) return { error: "You are not in this chat." };

  const existing = new Set(getRoomMembers(roomId).map((m) => m.id));
  const toAdd = validateInvitees(room.team_id, memberIds).filter((id) => !existing.has(id));
  const db = getDb();
  const insert = db.prepare("INSERT OR IGNORE INTO chat_members (room_id, user_id) VALUES (?, ?)");
  for (const uid of toAdd) insert.run(roomId, uid);
  return { added: toAdd.length };
}

export function getMessages(roomId, limit = 50, beforeId) {
  if (beforeId) {
    return getDb()
      .prepare(
        `SELECT m.*, u.name AS author_name FROM chat_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.room_id = ? AND m.id < ?
         ORDER BY m.created_at DESC, m.id DESC LIMIT ?`
      )
      .all(roomId, beforeId, limit)
      .reverse();
  }
  return getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name FROM chat_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.room_id = ?
       ORDER BY m.created_at ASC, m.id ASC LIMIT ?`
    )
    .all(roomId, limit);
}

export function sendMessage(roomId, userId, body) {
  const text = (body || "").trim();
  if (!text) return { error: "Message cannot be empty." };
  if (text.length > 2000) return { error: "Message too long (max 2000 characters)." };
  if (!isRoomMember(roomId, userId)) return { error: "You are not in this chat." };

  const info = getDb()
    .prepare("INSERT INTO chat_messages (room_id, user_id, body) VALUES (?, ?, ?)")
    .run(roomId, userId, text);
  const row = getDb()
    .prepare(
      `SELECT m.*, u.name AS author_name FROM chat_messages m
       JOIN users u ON u.id = m.user_id WHERE m.id = ?`
    )
    .get(info.lastInsertRowid);
  return { message: row };
}
