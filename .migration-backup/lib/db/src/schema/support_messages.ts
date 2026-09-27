import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  senderName: text("sender_name").notNull(),
  email: text("email"),
  message: text("message").notNull(),
  isAgent: boolean("is_agent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
