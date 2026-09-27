import { pgTable, serial, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ustasTable = pgTable("ustas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  specialty: text("specialty").notNull(),
  specialties: text("specialties").array().notNull().default([]),
  categoryId: text("category_id").notNull(),
  rating: real("rating").notNull().default(4.5),
  reviewCount: integer("review_count").notNull().default(0),
  priceMin: integer("price_min").notNull().default(300),
  priceMax: integer("price_max").notNull().default(800),
  lat: real("lat"),
  lng: real("lng"),
  isOnline: boolean("is_online").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  serviceAreas: text("service_areas").array().notNull().default([]),
  ownerDeviceId: text("owner_device_id"),
  claimCode: text("claim_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUstaSchema = createInsertSchema(ustasTable).omit({ id: true, createdAt: true });
export type InsertUsta = z.infer<typeof insertUstaSchema>;
export type Usta = typeof ustasTable.$inferSelect;
