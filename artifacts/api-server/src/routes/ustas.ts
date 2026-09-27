import { Router } from "express";
import { db, ustasTable, ustaLocationsTable, reviewsTable, requestsTable, ustaPortfolioTable, photoUploadsTable, notificationsTable, pushTokensTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  verifyClaimCode,
  isClaimLocked,
  recordClaimFailure,
  clearClaimFailures,
} from "../lib/claimCodes";
import { syncOnlineStatusToSupabase } from "../lib/supabase";
import { sendPushNotifications } from "../lib/pushNotifications";

const router = Router();
const portfolioUrl = (objectPath: string) => `/api/storage/portfolio${objectPath.replace(/^\/objects/, "")}`;

type UstaRow = typeof ustasTable.$inferSelect;

// Never expose ownership/enrollment credentials; return computed flags instead
function toPublic(row: UstaRow, deviceId: string | undefined) {
  const { ownerDeviceId, claimCode, ...rest } = row;
  return {
    ...rest,
    claimed: !!ownerDeviceId,
    // Manage only when this device owns the profile. Unclaimed profiles
    // require the enrollment claim code — they are NOT open to everyone.
    canManage: !!deviceId && !!ownerDeviceId && ownerDeviceId === deviceId,
    claimable: !ownerDeviceId && !!claimCode,
  };
}

router.get("/ustas", async (req, res) => {
  try {
    const deviceId = req.header("x-device-id");
    const ustas = await db.select().from(ustasTable);
    const ranked = [...ustas].sort((a, b) => {
      const score = (row: UstaRow) => (row.rating * row.reviewCount + 4 * 3) / (row.reviewCount + 3);
      return (score(b) - score(a)) || (Number(b.isOnline) - Number(a.isOnline)) || (b.reviewCount - a.reviewCount);
    });
    res.json(ranked.map((u) => toPublic(u, deviceId)));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch ustas");
    res.status(500).json({ error: "Ustalar alınamadı" });
  }
});

router.get("/ustas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const [usta] = await db.select().from(ustasTable).where(eq(ustasTable.id, id));
    if (!usta) return res.status(404).json({ error: "Usta bulunamadı" });
    const portfolio = await db.select({
      id: ustaPortfolioTable.id,
      title: ustaPortfolioTable.title,
      url: ustaPortfolioTable.objectPath,
      createdAt: ustaPortfolioTable.createdAt,
    }).from(ustaPortfolioTable).where(eq(ustaPortfolioTable.ustaId, id)).orderBy(sql`${ustaPortfolioTable.createdAt} DESC`);
    return res.json({ ...toPublic(usta, req.header("x-device-id")), portfolio: portfolio.map((item) => ({ ...item, url: portfolioUrl(item.url) })) });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch usta");
    return res.status(500).json({ error: "Usta alınamadı" });
  }
});

router.get("/ustas/:id/portfolio", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Geçersiz usta" });
  const items = await db.select({
    id: ustaPortfolioTable.id,
    title: ustaPortfolioTable.title,
    objectPath: ustaPortfolioTable.objectPath,
    createdAt: ustaPortfolioTable.createdAt,
  }).from(ustaPortfolioTable).where(eq(ustaPortfolioTable.ustaId, id)).orderBy(sql`${ustaPortfolioTable.createdAt} DESC`);
  return res.json(items.map((item) => ({ ...item, url: portfolioUrl(item.objectPath) })));
});

router.post("/ustas/:id/portfolio", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  const { objectPath, title } = req.body as { objectPath?: unknown; title?: unknown };
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  if (!Number.isInteger(id) || typeof objectPath !== "string" || !objectPath.startsWith("/objects/")) {
    return res.status(400).json({ error: "Geçerli görsel gerekli" });
  }
  const [usta] = await db.select({ id: ustasTable.id }).from(ustasTable).where(and(eq(ustasTable.id, id), eq(ustasTable.ownerDeviceId, deviceId)));
  if (!usta) return res.status(403).json({ error: "Bu profili yalnızca sahibi yönetebilir" });
  const [upload] = await db.select().from(photoUploadsTable).where(and(eq(photoUploadsTable.objectPath, objectPath), eq(photoUploadsTable.deviceId, deviceId), eq(photoUploadsTable.claimed, false)));
  if (!upload) return res.status(409).json({ error: "Görsel size ait değil veya daha önce kullanıldı" });
  try {
    const item = await db.transaction(async (tx) => {
      await tx.update(photoUploadsTable).set({ claimed: true }).where(eq(photoUploadsTable.id, upload.id));
      const [created] = await tx.insert(ustaPortfolioTable).values({ ustaId: id, objectPath, ownerDeviceId: deviceId, title: typeof title === "string" ? title.trim().slice(0, 120) || null : null }).returning();
      return created!;
    });
    return res.status(201).json({ ...item, url: portfolioUrl(item.objectPath) });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return res.status(409).json({ error: "Bu görsel zaten galeride" });
    req.log.error({ err }, "Failed to add portfolio image");
    return res.status(500).json({ error: "Galeriye eklenemedi" });
  }
});

router.delete("/ustas/:id/portfolio/:itemId", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  const deleted = await db.delete(ustaPortfolioTable).where(and(eq(ustaPortfolioTable.id, itemId), eq(ustaPortfolioTable.ustaId, id), eq(ustaPortfolioTable.ownerDeviceId, deviceId))).returning({ id: ustaPortfolioTable.id });
  if (!deleted.length) return res.status(404).json({ error: "Galeri görseli bulunamadı" });
  return res.status(204).end();
});

// Sync the authoritative availability into the map location record (local DB + Supabase Realtime)
async function syncLocationOnline(ustaId: number, isOnline: boolean) {
  await db
    .update(ustaLocationsTable)
    .set({ isOnline: isOnline ? "true" : "false" })
    .where(eq(ustaLocationsTable.ustaId, ustaId));

  // Mirror to Supabase so Realtime subscribers see the status change immediately.
  // Fire-and-forget: failures are logged inside syncOnlineStatusToSupabase.
  syncOnlineStatusToSupabase(ustaId, isOnline);
}

router.put("/ustas/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { isOnline } = req.body as { isOnline?: boolean };
    if (typeof isOnline !== "boolean") {
      return res.status(400).json({ error: "isOnline (boolean) gerekli" });
    }

    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    }

    const [usta] = await db.select().from(ustasTable).where(eq(ustasTable.id, id));
    if (!usta) return res.status(404).json({ error: "Usta bulunamadı" });

    if (!usta.ownerDeviceId) {
      // Unclaimed: require the pre-authorized enrollment claim code.
      // Rate limited per usta + caller to prevent brute forcing.
      const caller = `${deviceId}|${req.ip ?? ""}`;
      if (isClaimLocked(id, caller)) {
        return res
          .status(429)
          .json({ error: "Çok fazla hatalı deneme. Lütfen daha sonra tekrar deneyin." });
      }
      const claimCode = req.header("x-claim-code");
      if (!usta.claimCode || !claimCode || !verifyClaimCode(claimCode, usta.claimCode)) {
        recordClaimFailure(id, caller);
        return res.status(403).json({ error: "Geçersiz kayıt kodu" });
      }
      clearClaimFailures(id, caller);
      // Atomic claim: only succeeds if still unclaimed (no race)
      const [claimed] = await db
        .update(ustasTable)
        .set({ isOnline, ownerDeviceId: deviceId })
        .where(and(eq(ustasTable.id, id), isNull(ustasTable.ownerDeviceId)))
        .returning();
      if (!claimed) {
        return res.status(409).json({ error: "Profil az önce başka bir cihaz tarafından sahiplenildi" });
      }
      await syncLocationOnline(id, isOnline);
      return res.json(toPublic(claimed, deviceId));
    }

    // Claimed: only the owning device may change status
    if (usta.ownerDeviceId !== deviceId) {
      return res.status(403).json({ error: "Bu profili yalnızca sahibi yönetebilir" });
    }

    const [updated] = await db
      .update(ustasTable)
      .set({ isOnline })
      .where(and(eq(ustasTable.id, id), eq(ustasTable.ownerDeviceId, deviceId)))
      .returning();
    if (!updated) return res.status(403).json({ error: "Bu profili yalnızca sahibi yönetebilir" });

    await syncLocationOnline(id, isOnline);
    return res.json(toPublic(updated, deviceId));
  } catch (err) {
    req.log.error({ err }, "Failed to update usta status");
    return res.status(500).json({ error: "Usta durumu güncellenemedi" });
  }
});

// A professional may edit only the service areas and specialties owned by this device.
router.get("/ustas/:id/service-profile", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Geçersiz usta" });
  const [usta] = await db.select({
    id: ustasTable.id,
    serviceAreas: ustasTable.serviceAreas,
    specialties: ustasTable.specialties,
  }).from(ustasTable).where(and(eq(ustasTable.id, id), eq(ustasTable.ownerDeviceId, deviceId)));
  if (!usta) return res.status(404).json({ error: "Profil bulunamadı" });
  return res.json(usta);
});

router.put("/ustas/:id/service-profile", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  const { serviceAreas, specialties } = req.body as { serviceAreas?: unknown; specialties?: unknown };
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Geçersiz usta" });
  if (!Array.isArray(serviceAreas) || !serviceAreas.every((value) => typeof value === "string") || serviceAreas.length === 0) {
    return res.status(400).json({ error: "En az bir hizmet bölgesi seçin" });
  }
  if (!Array.isArray(specialties) || !specialties.every((value) => typeof value === "string") || specialties.length === 0) {
    return res.status(400).json({ error: "En az bir branş seçin" });
  }
  const [updated] = await db.update(ustasTable).set({
    serviceAreas: [...new Set(serviceAreas as string[])],
    specialties: [...new Set(specialties as string[])],
    specialty: (specialties as string[])[0]!,
  }).where(and(eq(ustasTable.id, id), eq(ustasTable.ownerDeviceId, deviceId))).returning();
  if (!updated) return res.status(404).json({ error: "Profil bulunamadı" });
  return res.json(toPublic(updated, deviceId));
});

// GET /api/ustas/:id/reviews — list reviews for an usta
router.get("/ustas/:id/reviews", async (req, res) => {
  try {
    const ustaId = parseInt(req.params["id"]!);
    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.ustaId, ustaId))
      .orderBy(sql`${reviewsTable.createdAt} DESC`);
    // Strip deviceId from public response
    return res.json(
      reviews.map(({ deviceId: _d, ...r }) => r),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to fetch reviews");
    return res.status(500).json({ error: "Yorumlar alınamadı" });
  }
});

// POST /api/ustas/:id/reviews — submit a review after job completion
router.post("/ustas/:id/reviews", async (req, res) => {
  try {
    const ustaId = parseInt(req.params["id"]!);
    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    }

    const { rating, comment, requestId } = req.body as {
      rating?: unknown;
      comment?: unknown;
      requestId?: unknown;
    };

    if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: "Puan 1-5 arasında bir tam sayı olmalıdır" });
    }
    if (typeof requestId !== "number" || !Number.isInteger(requestId)) {
      return res.status(400).json({ error: "requestId gerekli" });
    }

    // Verify the request is completed and belongs to this device
    const [request] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, requestId));

    if (!request) {
      return res.status(404).json({ error: "Talep bulunamadı" });
    }
    if (request.ownerDeviceId !== deviceId) {
      return res.status(403).json({ error: "Yalnızca talep sahibi yorum yapabilir" });
    }
    if (request.status !== "Tamamlandı") {
      return res.status(409).json({ error: "Yalnızca tamamlanmış işler için yorum yapılabilir" });
    }
    if (request.assignedUstaId !== String(ustaId)) {
      return res.status(400).json({ error: "Bu talep bu ustaya atanmamış" });
    }

    // Insert review and update usta's rating + reviewCount atomically.
    // Duplicate submissions are caught by the UNIQUE(request_id) constraint → 23505 → 409.
    // Uses incremental weighted-average so historical/seeded counts are preserved:
    //   new_avg = (old_avg * old_count + new_rating) / (old_count + 1)
    const newReview = await db.transaction(async (tx) => {
      // Lock the usta row to prevent concurrent rating drift
      const [ustaRow] = await tx
        .select({ rating: ustasTable.rating, reviewCount: ustasTable.reviewCount })
        .from(ustasTable)
        .where(eq(ustasTable.id, ustaId))
        .for("update");

      if (!ustaRow) throw Object.assign(new Error("usta_not_found"), { status: 404 });

      const [review] = await tx
        .insert(reviewsTable)
        .values({
          ustaId,
          requestId,
          rating,
          comment: typeof comment === "string" ? comment.trim() || null : null,
          // Use the request owner's stored name; never trust a client-supplied
          // reviewerName because it is displayed publicly.
          reviewerName: request.userName?.trim() || "Müşteri",
          deviceId,
        })
        .returning();

      // Incremental weighted average — preserves any existing aggregate (seeded or real)
      const oldCount = ustaRow.reviewCount;
      const oldRating = ustaRow.rating;
      const newCount = oldCount + 1;
      const newRating = (oldRating * oldCount + rating) / newCount;

      await tx
        .update(ustasTable)
        .set({ rating: newRating, reviewCount: newCount })
        .where(eq(ustasTable.id, ustaId));

      return review!;
    });

    const { deviceId: _d, ...publicReview } = newReview;
    const [usta] = await db
      .select({ name: ustasTable.name, ownerDeviceId: ustasTable.ownerDeviceId })
      .from(ustasTable)
      .where(eq(ustasTable.id, ustaId));

    if (usta?.ownerDeviceId) {
      try {
        const [notification] = await db.insert(notificationsTable).values({
          deviceId: usta.ownerDeviceId,
          ustaId,
          requestId,
          type: "new_review",
          title: "Yeni yıldız puanınız var",
          body: `${request.userName?.trim() || "Bir müşteri"} size ${rating} yıldız verdi${typeof comment === "string" && comment.trim() ? `: ${comment.trim()}` : "."}`,
        }).returning();

        if (notification) {
          const [pushToken] = await db.select().from(pushTokensTable).where(eq(pushTokensTable.deviceId, usta.ownerDeviceId));
          if (pushToken) {
            const sent = await sendPushNotifications([{
              to: pushToken.pushToken,
              title: notification.title,
              body: notification.body,
              data: { notificationId: notification.id, requestId },
              sound: "default",
            }], req.log);
            await db.update(notificationsTable).set({
              deliveryStatus: sent ? "sent" : "failed",
              lastError: sent ? null : "Expo push gönderimi başarısız",
            }).where(eq(notificationsTable.id, notification.id));
          }
        }
      } catch (notificationError) {
        req.log.error({ err: notificationError, ustaId, requestId }, "Failed to create review notification");
      }
    }
    return res.status(201).json(publicReview);
  } catch (err: unknown) {
    // Unique constraint violation — request already has a review
    const pgCode = (err as { code?: string }).code;
    if (pgCode === "23505") {
      return res.status(409).json({ error: "Bu talep için zaten bir yorum yapıldı" });
    }
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return res.status(404).json({ error: "Usta bulunamadı" });
    }
    req.log.error({ err }, "Failed to create review");
    return res.status(500).json({ error: "Yorum eklenemedi" });
  }
});

export default router;
