import { Router } from "express";
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, registrations, requestsTable, ustaLocationsTable, ustasTable } from "@workspace/db";
import { requireAdmin } from "./auth";
import { supabaseProxy } from "../lib/supabase";

const router = Router();
router.use(requireAdmin);

function publicRegistration(row: typeof registrations.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    district: row.district,
    isApproved: row.isApproved ?? false,
    isBlocked: row.isBlocked,
    createdAt: row.createdAt,
  };
}

router.get("/overview", async (req, res) => {
  try {
    const [customers] = await db.select({ value: count() }).from(registrations).where(eq(registrations.role, "customer"));
    const [craftsmen] = await db.select({ value: count() }).from(registrations).where(eq(registrations.role, "craftsman"));
    const [admins] = await db.select({ value: count() }).from(registrations).where(eq(registrations.role, "admin"));
    const [approved] = await db.select({ value: count() }).from(registrations).where(eq(registrations.isApproved, true));
    const [blocked] = await db.select({ value: count() }).from(registrations).where(eq(registrations.isBlocked, true));
    const [requests] = await db.select({ value: count() }).from(requestsTable);
    const [openRequests] = await db.select({ value: count() }).from(requestsTable).where(inArray(requestsTable.status, ["Beklemede", "Devam Ediyor"]));
    const [activeLocations] = await db.select({ value: count() }).from(ustaLocationsTable).where(eq(ustaLocationsTable.isOnline, "true"));
    const [completed] = await db.select({ value: count() }).from(requestsTable).where(eq(requestsTable.status, "Tamamlandı"));

    let revenue = 0;
    let revenueAvailable = false;
    try {
      const paymentResponse = await supabaseProxy("/rest/v1/payment_history?status=eq.success&select=amount");
      if (paymentResponse.ok) {
        const rows = await paymentResponse.json() as Array<{ amount?: string | number }>;
        revenue = rows.reduce((total, row) => total + (Number(row.amount) || 0), 0);
        revenueAvailable = true;
      }
    } catch (err) {
      req.log.warn({ err }, "Revenue source unavailable for admin overview");
    }

    return res.json({
      users: { customers: Number(customers?.value ?? 0), craftsmen: Number(craftsmen?.value ?? 0), admins: Number(admins?.value ?? 0), approved: Number(approved?.value ?? 0), blocked: Number(blocked?.value ?? 0) },
      requests: { total: Number(requests?.value ?? 0), open: Number(openRequests?.value ?? 0), completed: Number(completed?.value ?? 0) },
      activeLocations: Number(activeLocations?.value ?? 0),
      revenue: { amount: revenue, currency: "TRY", available: revenueAvailable },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load admin overview");
    return res.status(500).json({ error: "Yönetim özeti alınamadı" });
  }
});

router.get("/users", async (_req, res) => {
  try {
    const [registeredUsers, ustaProfiles] = await Promise.all([
      db.select().from(registrations).where(inArray(registrations.role, ["customer", "craftsman", "admin"])).orderBy(desc(registrations.createdAt)),
      db.select().from(ustasTable).orderBy(desc(ustasTable.createdAt)),
    ]);
    return res.json({
      users: registeredUsers.map(publicRegistration),
      profiles: ustaProfiles.map((row) => ({
        id: `usta-${row.id}`,
        sourceId: row.id,
        name: row.name,
        phone: row.phone,
        role: "craftsman",
        specialty: row.specialty,
        isApproved: row.verified,
        isBlocked: false,
        isOnline: row.isOnline,
        createdAt: row.createdAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Kullanıcılar alınamadı" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const action = req.body?.action;
  if (!Number.isInteger(id) || !["approve", "block", "unblock", "reject"].includes(action)) {
    return res.status(400).json({ error: "Geçersiz hesap işlemi" });
  }
  try {
    if (action === "approve" || action === "reject" || action === "block" || action === "unblock") {
      const patch: { isApproved?: boolean; isBlocked?: boolean } = {};
      if (action === "approve") patch.isApproved = true;
      if (action === "reject") patch.isApproved = false;
      if (action === "block") patch.isBlocked = true;
      if (action === "unblock") patch.isBlocked = false;
      const update = await db.update(registrations).set(patch).where(eq(registrations.id, id)).returning();
      if (update.length) return res.json(publicRegistration(update[0]!));
    }
    return res.status(404).json({ error: "Kayıt bulunamadı" });
  } catch (err) {
    req.log.error({ err, id, action }, "Failed to update account status");
    return res.status(500).json({ error: "Hesap durumu güncellenemedi" });
  }
});

router.get("/locations", async (_req, res) => {
  try {
    const [ustaLocations, customerLocations] = await Promise.all([
      db.select().from(ustaLocationsTable).where(eq(ustaLocationsTable.isOnline, "true")),
      db.select({
        id: requestsTable.id,
        name: requestsTable.userName,
        lat: requestsTable.customerLatitude,
        lng: requestsTable.customerLongitude,
        status: requestsTable.status,
        updatedAt: requestsTable.updatedAt,
      }).from(requestsTable).where(and(isNotNull(requestsTable.customerLatitude), isNotNull(requestsTable.customerLongitude), inArray(requestsTable.status, ["Beklemede", "Devam Ediyor"]))).orderBy(desc(requestsTable.updatedAt)),
    ]);
    return res.json({
      updatedAt: new Date().toISOString(),
      craftsmen: ustaLocations.map((row) => ({ id: row.ustaId, name: row.ustaName, specialty: row.specialty, lat: row.lat, lng: row.lng, heading: row.heading, updatedAt: row.updatedAt })),
      customers: customerLocations.map((row) => ({ id: row.id, name: row.name, lat: row.lat, lng: row.lng, status: row.status, updatedAt: row.updatedAt })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Canlı konumlar alınamadı" });
  }
});

router.get("/requests", async (_req, res) => {
  try {
    const requests = await db.select().from(requestsTable).orderBy(desc(requestsTable.updatedAt));
    const assignedIds = requests.map((row) => Number(row.assignedUstaId)).filter(Number.isInteger);
    const assigned = assignedIds.length ? await db.select({ id: ustasTable.id, name: ustasTable.name, specialty: ustasTable.specialty }).from(ustasTable).where(inArray(ustasTable.id, assignedIds)) : [];
    const assignedMap = new Map(assigned.map((row) => [String(row.id), row]));
    return res.json({
      requests: requests.map((row) => ({
        id: row.id,
        userName: row.userName,
        categoryName: row.categoryName,
        title: row.title,
        description: row.description,
        priority: row.priority,
        status: row.status,
        trackingStatus: row.trackingStatus,
        semt: row.semt,
        mahalle: row.mahalle,
        assignedUstaId: row.assignedUstaId,
        assignedUsta: row.assignedUstaId ? assignedMap.get(row.assignedUstaId) ?? null : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Talepler alınamadı" });
  }
});

export default router;