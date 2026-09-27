import { Router } from "express";
import { db } from "@workspace/db";
import { registrations, ustasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { generateClaimCode, hashClaimCode } from "../lib/claimCodes";

const router = Router();
const KVKK_CONSENT_VERSION = "2026-08-19-v1";

function hasRequiredKvkkConsent(value: unknown): value is true {
  return value === true;
}

function rejectMissingKvkkConsent(res: import("express").Response): void {
  res.status(400).json({ error: "Kayıt için KVKK ve kullanım şartları onayı zorunludur." });
}

// scrypt-tabanlı şifre hash'i — format: scrypt$<salt>$<hash>
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function checkDuplicate(email: string) {
  const existing = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.email, email))
    .limit(1);
  return existing.length > 0;
}

// ── POST /api/register/customer ───────────────────────────────────────────────
router.post("/customer", async (req, res) => {
  const { name, phone, email, password, district, address, kvkkConsent } = req.body;

  if (!name || !phone || !email || !password || !district) {
    return res.status(400).json({ error: "Ad, telefon, e-posta, şifre ve ilçe zorunludur." });
  }
  if (!hasRequiredKvkkConsent(kvkkConsent)) {
    rejectMissingKvkkConsent(res);
    return;
  }

  try {
    if (await checkDuplicate(email)) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const [created] = await db
      .insert(registrations)
      .values({
        role: "customer",
        name,
        phone,
        email,
        passwordHash: hashPassword(password),
        district: district ?? null,
        address: address ?? null,
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
        kvkkConsentVersion: KVKK_CONSENT_VERSION,
        isApproved: false,
      })
      .returning({ id: registrations.id, email: registrations.email });

    return res.status(201).json({
      id: created!.id,
      role: "customer",
      email: created!.email,
      message: "Müşteri kaydınız başarıyla oluşturuldu.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kayıt işlemi başarısız." });
  }
});

// ── POST /api/register/craftsman ──────────────────────────────────────────────
router.post("/craftsman", async (req, res) => {
  const { name, phone, email, password, specialty, specialties, categoryId, district, serviceAreas, experience, about, idNumber, kvkkConsent } = req.body;

  const submittedSpecialties = Array.isArray(specialties) ? specialties.filter((value) => typeof value === "string" && value.trim().length > 0) : [];
  const selectedSpecialties = submittedSpecialties.length > 0 ? submittedSpecialties : (specialty ? [specialty] : []);
  const selectedServiceAreas = Array.isArray(serviceAreas)
    ? serviceAreas.filter((value) => typeof value === "string" && value.trim().length > 0)
    : (district ? [district] : []);
  const primarySpecialty = specialty || selectedSpecialties[0];
  if (!name || !phone || !email || !password || !primarySpecialty || selectedServiceAreas.length === 0 || selectedSpecialties.length === 0) {
    return res.status(400).json({ error: "Ad, telefon, e-posta, şifre, en az bir uzmanlık ve hizmet bölgesi zorunludur." });
  }
  if (!hasRequiredKvkkConsent(kvkkConsent)) {
    rejectMissingKvkkConsent(res);
    return;
  }

  try {
    if (await checkDuplicate(email)) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const claimCode = generateClaimCode();

    const [created] = await db
      .insert(registrations)
      .values({
        role: "craftsman",
        name,
        phone,
        email,
        passwordHash: hashPassword(password),
        district: selectedServiceAreas[0] ?? null,
        serviceAreas: selectedServiceAreas,
        specialty: primarySpecialty,
        specialties: selectedSpecialties,
        experience: experience ? String(experience) : null,
        about: about ?? null,
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
        kvkkConsentVersion: KVKK_CONSENT_VERSION,
        isApproved: false,
      })
      .returning({ id: registrations.id, email: registrations.email });

    // Also create an usta entry so they appear in the usta directory
    const [usta] = await db
      .insert(ustasTable)
      .values({
        name,
        phone,
        specialty: primarySpecialty,
        specialties: selectedSpecialties,
        categoryId: categoryId ?? "genel",
        bio: about ?? null,
        serviceAreas: selectedServiceAreas,
        ownerDeviceId: req.header("x-device-id") ?? null,
        claimCode: hashClaimCode(claimCode),
      })
      .returning({ id: ustasTable.id });

    return res.status(201).json({
      id: created!.id,
      role: "craftsman",
      email: created!.email,
      ustaId: usta!.id,
      claimCode,
      message: "Usta kaydınız alındı. Belgeleriniz incelendikten sonra onaylanacak.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kayıt işlemi başarısız." });
  }
});

// ── POST /api/register/admin ──────────────────────────────────────────────────
router.post("/admin", async (req, res) => {
  const { name, email, password, adminCode, department, kvkkConsent } = req.body;

  if (!name || !email || !password || !adminCode) {
    return res.status(400).json({ error: "Ad, e-posta, şifre ve yönetici kodu zorunludur." });
  }
  if (!hasRequiredKvkkConsent(kvkkConsent)) {
    rejectMissingKvkkConsent(res);
    return;
  }

  // Admin enrollment requires a server-configured secret code.
  const expectedCode = process.env["ADMIN_REGISTRATION_CODE"];
  if (!expectedCode) {
    return res.status(503).json({ error: "Yönetici kaydı şu an kapalı." });
  }
  const provided = Buffer.from(String(adminCode));
  const expected = Buffer.from(expectedCode);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(403).json({ error: "Geçersiz yönetici kodu." });
  }

  try {
    if (await checkDuplicate(email)) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const [created] = await db
      .insert(registrations)
      .values({
        role: "admin",
        name,
        email,
        passwordHash: hashPassword(password),
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
        kvkkConsentVersion: KVKK_CONSENT_VERSION,
        isApproved: true,
      })
      .returning({ id: registrations.id, email: registrations.email });

    return res.status(201).json({
      id: created!.id,
      role: "admin",
      email: created!.email,
      message: "Yönetici hesabınız oluşturuldu.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kayıt işlemi başarısız." });
  }
});

// ── POST /api/register/site-yonetimi ─────────────────────────────────────────
router.post("/site-yonetimi", async (req, res) => {
  const { name, email, password, siteName, siteAddress, unitCount, district, kvkkConsent } = req.body;

  if (!name || !email || !password || !siteName || !siteAddress) {
    return res.status(400).json({ error: "Ad, e-posta, şifre, site adı ve adres zorunludur." });
  }
  if (!hasRequiredKvkkConsent(kvkkConsent)) {
    rejectMissingKvkkConsent(res);
    return;
  }

  try {
    if (await checkDuplicate(email)) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const [created] = await db
      .insert(registrations)
      .values({
        role: "site_yonetimi",
        name,
        email,
        passwordHash: hashPassword(password),
        district: district ?? null,
        about: JSON.stringify({ siteName, siteAddress, unitCount: unitCount ?? null }),
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
        kvkkConsentVersion: KVKK_CONSENT_VERSION,
        isApproved: false,
      })
      .returning({ id: registrations.id, email: registrations.email });

    return res.status(201).json({
      id: created!.id,
      role: "site_yonetimi",
      email: created!.email,
      message: "Site yönetimi kaydınız alındı. En kısa sürede onaylanacak.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kayıt işlemi başarısız." });
  }
});

// ── POST /api/register/nakliyeci ──────────────────────────────────────────────
router.post("/nakliyeci", async (req, res) => {
  const { name, phone, email, password, district, serviceAreas, vehicleType, vehicleTypes, capacity, licensePlate, experience, idNumber, licenseNumber, licenseClass, kvkkConsent } = req.body;
  const selectedServiceAreas = Array.isArray(serviceAreas)
    ? serviceAreas.filter((value) => typeof value === "string" && value.trim().length > 0)
    : (district ? [district] : []);
  const selectedVehicleTypes = Array.isArray(vehicleTypes)
    ? vehicleTypes.filter((value) => typeof value === "string" && value.trim().length > 0)
    : (vehicleType ? [vehicleType] : []);

  if (!name || !phone || !email || !password || !idNumber || String(idNumber).length !== 11 || !licenseNumber || !licenseClass || selectedVehicleTypes.length === 0 || selectedServiceAreas.length === 0) {
    return res.status(400).json({ error: "Ad, telefon, e-posta, TC kimlik, ehliyet bilgileri, en az bir araç/hizmet ve hizmet bölgesi zorunludur." });
  }
  if (!hasRequiredKvkkConsent(kvkkConsent)) {
    rejectMissingKvkkConsent(res);
    return;
  }

  try {
    if (await checkDuplicate(email)) {
      return res.status(409).json({ error: "Bu e-posta adresi zaten kayıtlı." });
    }

    const [created] = await db
      .insert(registrations)
      .values({
        role: "nakliyeci",
        name,
        phone,
        email,
        passwordHash: hashPassword(password),
        district: selectedServiceAreas[0] ?? null,
        serviceAreas: selectedServiceAreas,
        idNumber: String(idNumber),
        specialty: selectedVehicleTypes[0],
        experience: experience ? String(experience) : null,
        about: JSON.stringify({ capacity: capacity ?? null, licensePlate: licensePlate ?? null, vehicleTypes: selectedVehicleTypes, licenseNumber: String(licenseNumber), licenseClass: String(licenseClass) }),
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
        kvkkConsentVersion: KVKK_CONSENT_VERSION,
        isApproved: false,
      })
      .returning({ id: registrations.id, email: registrations.email });

    return res.status(201).json({
      id: created!.id,
      role: "nakliyeci",
      email: created!.email,
      message: "Nakliyeci başvurunuz alındı. Belgeleriniz incelendikten sonra onaylanacak.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Kayıt işlemi başarısız." });
  }
});

export default router;
