import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ustasTable } from "./ustas";
import { requestsTable } from "./requests";

export const reviewsTable = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    ustaId: integer("usta_id")
      .notNull()
      .references(() => ustasTable.id, { onDelete: "cascade" }),
    requestId: integer("request_id")
      .notNull()
      .references(() => requestsTable.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1–5
    comment: text("comment"),
    reviewerName: text("reviewer_name").notNull().default("Müşteri"),
    deviceId: text("device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One review per completed request — enforced at DB level to prevent races
    unique("reviews_request_id_unique").on(t.requestId),
  ],
);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
