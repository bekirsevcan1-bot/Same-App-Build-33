import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { requestsTable } from "./requests";
import { ustasTable } from "./ustas";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  ustaId: integer("usta_id").references(() => ustasTable.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => requestsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("new_request"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
}, (table) => ({
  requestUstaTypeUnique: unique("notifications_request_usta_type_unique").on(table.requestId, table.ustaId, table.type),
}));