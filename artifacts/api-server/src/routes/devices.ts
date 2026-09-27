import { Router } from "express";
import { db, pushTokensTable, requestsTable, ustasTable, ustaLocationsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router = Router();

/**
 * POST /devices/push-token
 *
 * Register or update an Expo push token for a device.
 * Used to send push notifications when request status changes.
 */
router.post("/devices/push-token", async (req, res) => {
  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    return res.status(401).json({ error: "Cihaz kimliği gerekli" });
  }

  const { pushToken } = req.body as { pushToken?: string };
  if (!pushToken || typeof pushToken !== "string") {
    return res.status(400).json({ error: "pushToken gerekli" });
  }

  // Validate Expo push token format
  if (!pushToken.startsWith("ExponentPushToken[") && !pushToken.startsWith("ExpoPushToken[")) {
    return res.status(400).json({ error: "Geçersiz push token formatı" });
  }

  try {
    await db
      .insert(pushTokensTable)
      .values({ deviceId, pushToken })
      .onConflictDoUpdate({
        target: pushTokensTable.deviceId,
        set: { pushToken },
      });

    return res.status(200).json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save push token");
    return res.status(500).json({ error: "Token kaydedilemedi" });
  }
});

/** Permanently remove all data owned by this auth-less device identity. */
router.delete("/devices/me", async (req, res) => {
  const deviceId = req.header("x-device-id");
  if (!deviceId) return res.status(401).json({ error: "Cihaz kimliği gerekli" });

  try {
    await db.transaction(async (tx) => {
      const ownedUstas = await tx
        .select({ id: ustasTable.id })
        .from(ustasTable)
        .where(eq(ustasTable.ownerDeviceId, deviceId));
      if (ownedUstas.length > 0) {
        await tx.delete(ustaLocationsTable).where(inArray(ustaLocationsTable.ustaId, ownedUstas.map((usta) => usta.id)));
        await tx.delete(ustasTable).where(eq(ustasTable.ownerDeviceId, deviceId));
      }
      await tx.delete(requestsTable).where(eq(requestsTable.ownerDeviceId, deviceId));
      await tx.delete(pushTokensTable).where(eq(pushTokensTable.deviceId, deviceId));
    });
    return res.json({ ok: true, message: "Hesabınız ve bu cihaza bağlı veriler silindi." });
  } catch (err) {
    req.log.error({ err }, "Failed to delete device account");
    return res.status(500).json({ error: "Hesap silinemedi" });
  }
});

export default router;
