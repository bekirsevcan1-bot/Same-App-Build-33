import { Router } from "express";
import { and, desc, eq, isNull, gte } from "drizzle-orm";
import { db, notificationsTable, pushTokensTable, ustasTable } from "@workspace/db";
import { sendPushNotifications } from "../lib/pushNotifications";
import { supabaseProxy } from "../lib/supabase";

const router = Router();

async function deliver(notification: typeof notificationsTable.$inferSelect, log: { error: (...args: unknown[]) => void }) {
  const [token] = await db.select().from(pushTokensTable).where(eq(pushTokensTable.deviceId, notification.deviceId));
  if (!token) return false;
  const ok = await sendPushNotifications([{
    to: token.pushToken,
    title: notification.title,
    body: notification.body,
    data: { notificationId: notification.id, requestId: notification.requestId, ustaId: notification.ustaId, type: notification.type },
    sound: "default",
  }], log);
  await db.update(notificationsTable).set({
    deliveryStatus: ok ? "sent" : "failed",
    lastError: ok ? null : "Expo push gönderimi başarısız",
  }).where(eq(notificationsTable.id, notification.id));
  return ok;
}

async function ensureCustomerHighlights(deviceId: string, log: { error: (...args: unknown[]) => void }) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.select({
    type: notificationsTable.type,
    ustaId: notificationsTable.ustaId,
  }).from(notificationsTable).where(and(
    eq(notificationsTable.deviceId, deviceId),
    gte(notificationsTable.createdAt, since),
  ));

  const notify = async (input: {
    type: string;
    title: string;
    body: string;
    ustaId?: number;
  }) => {
    if (recent.some((item) => item.type === input.type && (input.ustaId == null || item.ustaId === input.ustaId))) return;
    const [notification] = await db.insert(notificationsTable).values({
      deviceId,
      ustaId: input.ustaId ?? null,
      requestId: null,
      type: input.type,
      title: input.title,
      body: input.body,
    }).returning();
    if (notification) await deliver(notification, log);
  };

  let discountTitle = "Usta Cepte fırsatları";
  let discountBody = "Seçili hizmetlerde güncel indirimleri ve avantajlı teklifleri keşfedin.";
  try {
    const response = await supabaseProxy("/rest/v1/supplier_deals?select=title,discount_percentage,discounted_price&order=created_at.desc&limit=1");
    if (response.ok) {
      const [deal] = await response.json() as Array<{ title?: string; discount_percentage?: number | null; discounted_price?: number | null }>;
      if (deal?.title) {
        discountTitle = deal.title;
        const discount = deal.discount_percentage != null ? `%${deal.discount_percentage} indirim` : deal.discounted_price != null ? `${deal.discounted_price} TL’den başlayan fiyatlarla` : "güncel kampanya";
        discountBody = `${discount}. Detayları keşfetmek için fırsatlara göz atın.`;
      }
    }
  } catch (err) {
    log.error({ err }, "Failed to load supplier deal highlight");
  }

  await notify({
    type: "customer_discount",
    title: discountTitle,
    body: discountBody,
  });

  const ustas = await db.select({
    id: ustasTable.id,
    name: ustasTable.name,
    specialty: ustasTable.specialty,
    rating: ustasTable.rating,
    reviewCount: ustasTable.reviewCount,
  }).from(ustasTable);
  const topUsta = [...ustas].sort((a, b) => {
    const score = (row: typeof a) => (row.rating * row.reviewCount + 4 * 3) / (row.reviewCount + 3);
    return (score(b) - score(a)) || (b.reviewCount - a.reviewCount);
  })[0];
  if (topUsta) {
    await notify({
      type: "customer_top_rated",
      ustaId: topUsta.id,
      title: "Yüksek puanlı usta önerisi",
      body: `${topUsta.name}, ${topUsta.specialty} branşında ${topUsta.rating.toFixed(1)} yıldız ve ${topUsta.reviewCount} değerlendirmeyle öne çıkıyor.`,
    });
  }
}

router.get("/notifications", async (req, res) => {
  const deviceId = req.header("x-device-id");
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  try {
    try {
      await ensureCustomerHighlights(deviceId, req.log);
    } catch (err) {
      // A recommendation/push failure must never hide existing notifications.
      req.log.error({ err, deviceId }, "Failed to prepare customer highlights");
    }
    const rows = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.deviceId, deviceId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    return res.json({
      notifications: rows.map(({ deviceId: _device, ...row }) => row),
      unreadCount: rows.filter((row) => !row.read).length,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch notifications");
    return res.status(500).json({ error: "Bildirimler alınamadı" });
  }
});

router.put("/notifications/:id/read", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Geçersiz bildirim" });
  try {
    const [updated] = await db.update(notificationsTable)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.deviceId, deviceId)))
      .returning();
    if (!updated) return res.status(404).json({ error: "Bildirim bulunamadı" });
    const { deviceId: _device, ...publicNotification } = updated;
    return res.json(publicNotification);
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification read");
    return res.status(500).json({ error: "Bildirim güncellenemedi" });
  }
});

router.post("/notifications/:id/retry", async (req, res) => {
  const deviceId = req.header("x-device-id");
  const id = Number(req.params.id);
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  try {
    const [notification] = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.deviceId, deviceId)));
    if (!notification) return res.status(404).json({ error: "Bildirim bulunamadı" });
    const delivered = await deliver(notification, req.log);
    return res.json({ ok: delivered, deliveryStatus: delivered ? "sent" : "failed" });
  } catch (err) {
    req.log.error({ err }, "Failed to retry notification");
    return res.status(500).json({ error: "Bildirim yeniden gönderilemedi" });
  }
});

export default router;