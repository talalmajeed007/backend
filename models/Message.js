const { query } = require('../db/index');
const { db, schema } = require('../db/drizzle');
const { eq, desc, asc } = require('drizzle-orm');
const { messages } = schema;

class Message {
  constructor(id, username, content, timestamp, room = 'general') {
    this.id = id;
    this.username = username;
    this.content = content;
    this.timestamp = timestamp;
    this.room = room;
  }
}

class MessageStore {
  async init() {
    // Drizzle migrations are recommended; fallback to ensuring table exists
    await query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      content TEXT NOT NULL,
      room TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages (room, created_at);`);
  }

  async addMessage(username, content, room = 'general') {
    const [row] = await db.insert(messages)
      .values({ username, content, room })
      .returning();
    return new Message(String(row.id), row.username, row.content, new Date(row.createdAt ?? row.created_at), row.room);
  }

  async getMessages(room = 'general') {
    const rows = await db.select().from(messages)
      .where(eq(messages.room, room))
      .orderBy(asc(messages.createdAt));
    return rows.map(r => new Message(String(r.id), r.username, r.content, new Date(r.createdAt ?? r.created_at), r.room));
  }

  async getRecentMessages(limit = 50, room = 'general') {
    const rows = await db.select().from(messages)
      .where(eq(messages.room, room))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    rows.reverse();
    return rows.map(r => new Message(String(r.id), r.username, r.content, new Date(r.createdAt ?? r.created_at), r.room));
  }
}

module.exports = { Message, MessageStore };
