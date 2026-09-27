import { Router } from "express";
import { db, ustaLocationsTable, ustasTable, insertUstaLocationSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { syncLocationToSupabase } from "../lib/supabase";

const router = Router();

router.get("/locations", async (req, res) => {
  try {
    const locations = await db
      .select()
      .from(ustaLocationsTable)
      .where(eq(ustaLocationsTable.isOnline, "true"));
    res.json(locations);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch locations");
    res.status(500).json({ error: "Konumlar alınamadı" });
  }
});

router.post("/locations", async (req, res) => {
  const parsed = insertUstaLocationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçersiz konum verisi" });
  }

  try {
    // Ownership: location writes require an existing, claimed usta profile
    // and a matching owner device id. Unknown or unclaimed ustas are rejected
    // so anonymous callers cannot publish phantom or falsified map data.
    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    }
    const [usta] = await db
      .select({ ownerDeviceId: ustasTable.ownerDeviceId })
      .from(ustasTable)
      .where(eq(ustasTable.id, parsed.data.ustaId));
    if (!usta) {
      return res.status(404).json({ error: "Usta bulunamadı" });
    }
    if (!usta.ownerDeviceId || usta.ownerDeviceId !== deviceId) {
      return res.status(403).json({ error: "Bu ustanın konumunu yalnızca sahibi güncelleyebilir" });
    }

    // Upsert: update if exists, insert if not
    const existing = await db
      .select({ id: ustaLocationsTable.id })
      .from(ustaLocationsTable)
      .where(eq(ustaLocationsTable.ustaId, parsed.data.ustaId));

    let location;
    if (existing.length > 0) {
      [location] = await db
        .update(ustaLocationsTable)
        .set({ ...parsed.data })
        .where(eq(ustaLocationsTable.ustaId, parsed.data.ustaId))
        .returning();
    } else {
      [location] = await db.insert(ustaLocationsTable).values(parsed.data).returning();
    }

    // Async Supabase sync (fire and forget)
    syncLocationToSupabase({
      ustaId: parsed.data.ustaId,
      ustaName: parsed.data.ustaName,
      specialty: parsed.data.specialty,
      categoryId: parsed.data.categoryId,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      heading: parsed.data.heading ?? undefined,
      isOnline: parsed.data.isOnline ?? "true",
    });

    return res.json(location);
  } catch (err) {
    req.log.error({ err }, "Failed to update location");
    return res.status(500).json({ error: "Konum güncellenemedi" });
  }
});

export default router;
