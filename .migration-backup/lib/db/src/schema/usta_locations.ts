import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ustaLocationsTable = pgTable("usta_locations", {
  id: serial("id").primaryKey(),
  ustaId: integer("usta_id").notNull().unique(),
  ustaName: text("usta_name").notNull(),
  specialty: text("specialty").notNull(),
  categoryId: text("category_id").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  heading: real("heading"),
  speed: real("speed"),
  isOnline: text("is_online").notNull().default("true"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUstaLocationSchema = createInsertSchema(ustaLocationsTable).omit({ id: true, updatedAt: true });
export type InsertUstaLocation = z.infer<typeof insertUstaLocationSchema>;
export type UstaLocation = typeof ustaLocationsTable.$inferSelect;
