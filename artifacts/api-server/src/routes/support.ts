import { Router } from "express";
import { db } from "@workspace/db";
import { supportMessages } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// POST /api/support/message
router.post("/message", async (req, res) => {
  const { sessionId, senderName, message, email } = req.body;

  if (!senderName || !message) {
    return res.status(400).json({ error: "Ad ve mesaj zorunludur." });
  }

  const sid = sessionId ?? crypto.randomUUID();

  try {
    const [created] = await db
      .insert(supportMessages)
      .values({
        sessionId: sid,
        senderName,
        email: email ?? null,
        message,
        isAgent: false,
      })
      .returning();

    // Auto-reply from agent after a brief moment
    await db.insert(supportMessages).values({
      sessionId: sid,
      senderName: "Destek Ekibi",
      email: null,
      message: `Merhaba ${senderName}! Mesajınız alındı. En kısa sürede size dönüş yapacağız. Ortalama yanıt süremiz 5-10 dakikadır.`,
      isAgent: true,
    });

    return res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Mesaj gönderilemedi." });
  }
});

// GET /api/support/messages
router.get("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;

  // Session-bound access only: without a session id there is no global listing.
  // (Prevents disclosure of other users' names, emails, and messages.)
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId gerekli." });
  }

  try {
    const rows = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.sessionId, sessionId))
      .orderBy(supportMessages.createdAt);

    return res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Mesajlar alınamadı." });
  }
});

export default router;
