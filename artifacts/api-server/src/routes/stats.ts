import { Router } from "express";
import { db } from "@workspace/db";
import { registrations, requestsTable, ustasTable, ustaLocationsTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";

const router = Router();

// GET /api/stats
router.get("/", async (_req, res) => {
  try {
    const [totalUstasRow] = await db
      .select({ count: count() })
      .from(ustasTable);

    const [totalCustomersRow] = await db
      .select({ count: count() })
      .from(registrations)
      .where(eq(registrations.role, "customer"));

    const [totalRequestsRow] = await db
      .select({ count: count() })
      .from(requestsTable);

    const [completedRow] = await db
      .select({ count: count() })
      .from(requestsTable)
      .where(eq(requestsTable.status, "Tamamlandı"));

    const [activeUstasRow] = await db
      .select({ count: count() })
      .from(ustaLocationsTable)
      .where(eq(ustaLocationsTable.isOnline, "true"));

    const [ratingRow] = await db
      .select({ avg: avg(ustasTable.rating) })
      .from(ustasTable);

    return res.json({
      totalUstas: Number(totalUstasRow?.count ?? 0),
      totalCustomers: Number(totalCustomersRow?.count ?? 0),
      totalRequests: Number(totalRequestsRow?.count ?? 0),
      completedRequests: Number(completedRow?.count ?? 0),
      activeUstas: Number(activeUstasRow?.count ?? 0),
      avgRating: ratingRow?.avg ? parseFloat(String(ratingRow.avg)) : 4.7,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "İstatistikler alınamadı." });
  }
});

export default router;
