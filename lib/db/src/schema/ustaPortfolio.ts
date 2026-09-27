import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { ustasTable } from "./ustas";

export const ustaPortfolioTable = pgTable(
  "usta_portfolio",
  {
    id: serial("id").primaryKey(),
    ustaId: integer("usta_id").notNull().references(() => ustasTable.id, { onDelete: "cascade" }),
    objectPath: text("object_path").notNull(),
    title: text("title"),
    ownerDeviceId: text("owner_device_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("usta_portfolio_object_path_unique").on(t.objectPath)],
);

export type UstaPortfolio = typeof ustaPortfolioTable.$inferSelect;