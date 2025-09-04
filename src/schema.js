const { pgTable, serial, text, timestamp, index } = require('drizzle-orm/pg-core');

const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  content: text('content').notNull(),
  room: text('room').notNull().default('general'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roomCreatedIdx: index('idx_messages_room_created_at').on(table.room, table.createdAt),
}));

module.exports = { messages };


