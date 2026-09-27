import { pgTable, serial, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull().default("Kullanıcı"),
  categoryId: text("category_id").notNull(),
  categoryName: text("category_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("Bugün"),
  timeRange: text("time_range"),
  semt: text("semt").notNull(),
  mahalle: text("mahalle").notNull(),
  sokak: text("sokak"),
  status: text("status").notNull().default("Beklemede"),
  assignedUstaId: text("assigned_usta_id"),
  customerLatitude: real("customer_latitude"),
  customerLongitude: real("customer_longitude"),
  artisanLatitude: real("artisan_latitude"),
  artisanLongitude: real("artisan_longitude"),
  trackingStatus: text("tracking_status").notNull().default("Beklemede"),
  ownerDeviceId: text("owner_device_id"),
  photos: text("photos").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
