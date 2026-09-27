import { Router } from "express";
import { db, requestsTable, ustasTable, insertRequestSchema, photoUploadsTable, notificationsTable, pushTokensTable } from "@workspace/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { sendPushNotifications, statusChangeBody } from "../lib/pushNotifications";

const router = Router();

// Allowed lifecycle transitions (server-enforced)
const TRANSITIONS: Record<string, string[]> = {
  Beklemede: ["Devam Ediyor", "İptal"],
  "Devam Ediyor": ["Tamamlandı", "İptal"],
  Tamamlandı: [],
  İptal: [],
};

// Public create schema: clients may not set status or ownership
const createRequestSchema = insertRequestSchema.omit({ status: true, ownerDeviceId: true });

type RequestRow = typeof requestsTable.$inferSelect;

// Never expose the ownership token; return a computed capability flag instead.
// Strip photo paths from responses for non-owners — paths are private storage
// references that should only be visible to authorized parties.
function toPublic(row: RequestRow, canManage: boolean, canReview: boolean, deviceId?: string) {
  const { ownerDeviceId, customerLatitude, customerLongitude, artisanLatitude, artisanLongitude, trackingStatus, ...rest } = row;
  return {
    ...rest,
    customerLatitude: canManage ? customerLatitude : null,
    customerLongitude: canManage ? customerLongitude : null,
    artisanLatitude: canManage ? artisanLatitude : null,
    artisanLongitude: canManage ? artisanLongitude : null,
    trackingStatus: canManage ? trackingStatus : "Beklemede",
    photos: canManage ? (rest.photos ?? []) : [],
    canManage,
    canReview,
    isAssignedProfessional: !!row.assignedUstaId && !!deviceId && row.ownerDeviceId !== deviceId && canManage,
  };
}

async function computeCanManage(row: RequestRow, deviceId: string | undefined): Promise<boolean> {
  if (!deviceId) return false;
  if (row.ownerDeviceId === deviceId) return true;
  if (row.assignedUstaId) {
    const ustaId = parseInt(row.assignedUstaId);
    if (!Number.isNaN(ustaId)) {
      const [usta] = await db.select().from(ustasTable).where(eq(ustasTable.id, ustaId));
      return !!usta && !!usta.ownerDeviceId && usta.ownerDeviceId === deviceId;
    }
  }
  return false;
}

async function assignedDeviceId(row: RequestRow): Promise<string | null> {
  if (!row.assignedUstaId) return null;
  const ustaId = parseInt(row.assignedUstaId);
  if (Number.isNaN(ustaId)) return null;
  const [usta] = await db.select({ ownerDeviceId: ustasTable.ownerDeviceId }).from(ustasTable).where(eq(ustasTable.id, ustaId));
  return usta?.ownerDeviceId ?? null;
}

function computeCanReview(row: RequestRow, deviceId: string | undefined): boolean {
  return !!deviceId && row.ownerDeviceId === deviceId;
}

interface SimpleLogger {
  error: (obj: Record<string, unknown>, msg: string) => void;
}

/** Look up push tokens for a device and send a status change notification */
async function notifyOwner(
  ownerDeviceId: string | null | undefined,
  newStatus: string,
  requestId: number,
  log: SimpleLogger,
  copy?: { title: string; body: string },
): Promise<void> {
  if (!ownerDeviceId) return;
  try {
    const [tokenRow] = await db
      .select()
      .from(pushTokensTable)
      .where(eq(pushTokensTable.deviceId, ownerDeviceId));
    if (!tokenRow) return;

    await sendPushNotifications(
      [
        {
          to: tokenRow.pushToken,
          title: copy?.title ?? "Talep Güncellendi",
          body: copy?.body ?? statusChangeBody(newStatus),
          data: { requestId },
          sound: "default",
        },
      ],
      log,
    );
  } catch (err) {
    log.error({ err }, "Failed to send status-change notification");
  }
}

function areaMatches(serviceAreas: string[] | null | undefined, district: string, neighborhood: string) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase("tr-TR");
  const areas = (serviceAreas ?? []).map(normalize);
  const districtKey = normalize(district);
  const neighborhoodKey = normalize(`${district} / ${neighborhood}`);
  return areas.includes(districtKey) || areas.includes(neighborhoodKey);
}

async function notifyMatchingProfessionals(request: RequestRow, log: SimpleLogger) {
  const professionals = await db.select().from(ustasTable);
  const matches = professionals.filter((usta) => {
    const requested = request.categoryName.trim().toLocaleLowerCase("tr-TR");
    const categoryMatches = usta.categoryId === request.categoryId
      || [usta.specialty, ...(usta.specialties ?? [])]
        .filter(Boolean)
        .some((specialty) => specialty.trim().toLocaleLowerCase("tr-TR") === requested);
    return !!usta.ownerDeviceId && areaMatches(usta.serviceAreas, request.semt, request.mahalle) &&
      (categoryMatches || (usta.specialty === "Genel" && request.categoryId === "genel"));
  });

  for (const usta of matches) {
    const title = "Yeni hizmet talebi";
    const body = `${request.semt} / ${request.mahalle} bölgesinde ${request.categoryName} talebi var.`;
    try {
      const [notification] = await db.insert(notificationsTable).values({
        deviceId: usta.ownerDeviceId!,
        ustaId: usta.id,
        requestId: request.id,
        type: "new_request",
        title,
        body,
      }).onConflictDoNothing().returning();
      if (!notification) continue;
      const [token] = await db.select().from(pushTokensTable).where(eq(pushTokensTable.deviceId, usta.ownerDeviceId!));
      if (!token) continue;
      const sent = await sendPushNotifications([{
        to: token.pushToken, title, body,
        data: { notificationId: notification.id, requestId: request.id },
        sound: "default",
      }], log);
      await db.update(notificationsTable).set({
        deliveryStatus: sent ? "sent" : "failed",
        lastError: sent ? null : "Expo push gönderimi başarısız",
      }).where(eq(notificationsTable.id, notification.id));
    } catch (err) {
      log.error({ err, requestId: request.id, ustaId: usta.id }, "Failed to notify matching professional");
    }
  }
}

router.get("/requests", async (req, res) => {
  try {
    const deviceId = req.header("x-device-id");
    const requests = await db.select().from(requestsTable).orderBy(desc(requestsTable.createdAt));
    const visible = await Promise.all(requests.map(async (r) => {
      const canManage = await computeCanManage(r, deviceId);
      return toPublic(r, canManage, computeCanReview(r, deviceId), deviceId);
    }));
    res.json(visible);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch requests");
    res.status(500).json({ error: "Talepler alınamadı" });
  }
});

router.get("/requests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
    if (!request) return res.status(404).json({ error: "Talep bulunamadı" });
    const deviceId = req.header("x-device-id");
    const canManage = await computeCanManage(request, deviceId);
    return res.json(toPublic(request, canManage, computeCanReview(request, deviceId), deviceId));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch request");
    return res.status(500).json({ error: "Talep alınamadı" });
  }
});

router.post("/requests", async (req, res) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçersiz talep verisi", details: parsed.error.issues });
  }
  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  }
  try {
    const photos: string[] = parsed.data.photos ?? [];

    if (photos.length > 10) {
      return res.status(400).json({ error: "En fazla 10 fotoğraf eklenebilir" });
    }

    const request = await db.transaction(async (tx) => {
      if (photos.length > 0) {
        // Atomic conditional claim: UPDATE WHERE claimed=false AND deviceId matches.
        // Returns only rows that were actually unclaimed and owned by this device.
        // Prevents TOCTOU: if a concurrent request already claimed a photo, it won't
        // satisfy the WHERE clause and the row count will be short.
        const claimed = await tx
          .update(photoUploadsTable)
          .set({ claimed: true })
          .where(
            and(
              inArray(photoUploadsTable.objectPath, photos),
              eq(photoUploadsTable.deviceId, deviceId),
              eq(photoUploadsTable.claimed, false),
            ),
          )
          .returning();

        if (claimed.length !== photos.length) {
          // Some photos were not found, already claimed, or belong to another device
          throw Object.assign(new Error("photo_claim_failed"), { status: 409 });
        }
      }

      const [row] = await tx
        .insert(requestsTable)
        .values({ ...parsed.data, status: "Beklemede", ownerDeviceId: deviceId })
        .returning();

      return row!;
    });

    void notifyOwner(
      request.ownerDeviceId,
      request.status,
      request.id,
      req.log,
      {
        title: "Talebiniz alındı",
        body: "Teşekkür ederiz. Talebiniz başarıyla oluşturuldu; uygun hizmet verenleri sizin için arıyoruz.",
      },
    );
    void notifyMatchingProfessionals(request, req.log).catch((err) => req.log.error({ err }, "Failed to match request professionals"));
    return res.status(201).json(toPublic(request, true, true, deviceId));
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 409) {
      return res.status(409).json({ error: "Bir veya daha fazla fotoğraf zaten başka bir talebe eklenmiş veya size ait değil" });
    }
    req.log.error({ err }, "Failed to create request");
    return res.status(500).json({ error: "Talep oluşturulamadı" });
  }
});

/**
 * POST /requests/:id/photos
 * Append photo object paths (uploaded to GCS) to an existing request.
 * Requires x-device-id matching the request owner.
 */
router.post("/requests/:id/photos", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    }

    const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
    if (!request) return res.status(404).json({ error: "Talep bulunamadı" });

    const authorized = await computeCanManage(request, deviceId);
    if (!authorized) {
      return res.status(403).json({ error: "Bu talebe fotoğraf ekleme yetkiniz yok" });
    }

    const { photos } = req.body as { photos?: string[] };
    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: "photos dizisi gerekli" });
    }

    const currentPhotos: string[] = request.photos ?? [];
    if (currentPhotos.length + photos.length > 10) {
      return res.status(400).json({ error: "Toplam fotoğraf sayısı 10'u geçemez" });
    }

    const updated = await db.transaction(async (tx) => {
      // Atomically claim photos: conditional UPDATE prevents TOCTOU race conditions.
      // Rows that are already claimed or belong to another device won't satisfy the WHERE
      // clause, so claimed.length < photos.length signals a conflict.
      const claimed = await tx
        .update(photoUploadsTable)
        .set({ claimed: true })
        .where(
          and(
            inArray(photoUploadsTable.objectPath, photos),
            eq(photoUploadsTable.deviceId, deviceId),
            eq(photoUploadsTable.claimed, false),
          ),
        )
        .returning();

      if (claimed.length !== photos.length) {
        throw Object.assign(new Error("photo_claim_failed"), { status: 409 });
      }

      const merged = [...currentPhotos, ...photos];
      const [row] = await tx
        .update(requestsTable)
        .set({ photos: merged })
        .where(eq(requestsTable.id, id))
        .returning();

      return row!;
    });

    const canManage = await computeCanManage(updated, deviceId);
    return res.json(toPublic(updated, canManage, computeCanReview(updated, deviceId), deviceId));
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 409) {
      return res.status(409).json({ error: "Bir veya daha fazla fotoğraf zaten kullanılmış veya size ait değil" });
    }
    req.log.error({ err }, "Failed to add photos");
    return res.status(500).json({ error: "Fotoğraflar eklenemedi" });
  }
});

router.put("/requests/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { status } = req.body as { status: string };
    if (!status || !(status in TRANSITIONS)) {
      return res.status(400).json({ error: "Geçersiz durum" });
    }

    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    }

    const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
    if (!request) return res.status(404).json({ error: "Talep bulunamadı" });

    // Authorization: only the request owner or the assigned usta's owner may change status
    const authorized = await computeCanManage(request, deviceId);
    if (!authorized) {
      return res.status(403).json({ error: "Bu talebin durumunu değiştirme yetkiniz yok" });
    }

    // Lifecycle enforcement
    const allowed = TRANSITIONS[request.status] ?? [];
    if (!allowed.includes(status)) {
      return res
        .status(409)
        .json({ error: `"${request.status}" durumundan "${status}" durumuna geçilemez` });
    }

    const [updated] = await db
      .update(requestsTable)
      .set({ status })
      .where(eq(requestsTable.id, id))
      .returning();

    // Notify the customer and the assigned professional, without duplicating a device.
    const professionalDevice = await assignedDeviceId(request);
    const recipients = [request.ownerDeviceId, professionalDevice].filter(
      (value, index, all): value is string => !!value && all.indexOf(value) === index,
    );
    void Promise.all(recipients.map((recipient) => notifyOwner(recipient, status, id, req.log)));

    return res.json(toPublic(updated!, true, request.ownerDeviceId === deviceId, deviceId));
  } catch (err) {
    req.log.error({ err }, "Failed to update request status");
    return res.status(500).json({ error: "Durum güncellenemedi" });
  }
});

router.put("/requests/:id/tracking", async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const deviceId = req.header("x-device-id");
    const { latitude, longitude, trackingStatus } = req.body as {
      latitude?: number;
      longitude?: number;
      trackingStatus?: string;
    };
    if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude!) > 90 || Math.abs(longitude!) > 180) {
      return res.status(400).json({ error: "Geçerli koordinatlar gerekli" });
    }
    const lat = latitude as number;
    const lng = longitude as number;
    const [request] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
    if (!request) return res.status(404).json({ error: "Talep bulunamadı" });
    if (!(await computeCanManage(request, deviceId))) {
      return res.status(403).json({ error: "Bu talebin konumunu güncelleme yetkiniz yok" });
    }
    const isAssignedArtisan = request.assignedUstaId && request.ownerDeviceId !== deviceId;
    const update = isAssignedArtisan
      ? { artisanLatitude: lat, artisanLongitude: lng, trackingStatus: trackingStatus || "Yolda" }
      : { customerLatitude: lat, customerLongitude: lng };
    const [updated] = await db.update(requestsTable).set(update).where(eq(requestsTable.id, id)).returning();
    return res.json(toPublic(updated!, true, request.ownerDeviceId === deviceId, deviceId));
  } catch (err) {
    req.log.error({ err }, "Failed to update request tracking");
    return res.status(500).json({ error: "Canlı konum güncellenemedi" });
  }
});

export default router;
