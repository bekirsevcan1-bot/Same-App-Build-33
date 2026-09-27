import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Tracks server-side ownership of each uploaded photo.
 * Before a photo path can be linked to a request, the requesting device
 * must appear as the uploader in this table and the path must be unclaimed.
 */
export const photoUploadsTable = pgTable("photo_uploads", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  objectPath: text("object_path").notNull().unique(),
  claimed: boolean("claimed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
