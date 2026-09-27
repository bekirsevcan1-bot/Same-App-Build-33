import { Router } from "express";
import { db, ustasTable, ustaLocationsTable } from "@workspace/db";
import { generateClaimCode, hashClaimCode } from "../lib/claimCodes";

const router = Router();

const SAMPLE_USTAS = [
  {
    name: "Ahmet Yılmaz",
    specialty: "Elektrik Ustası",
    categoryId: "elektrik",
    rating: 4.9,
    reviewCount: 142,
    priceMin: 450,
    priceMax: 900,
    lat: 36.8984,
    lng: 30.7117,
    isOnline: true,
    verified: true,
    bio: "15 yıllık deneyimli elektrik ustası. Sigorta, priz, aydınlatma.",
  },
  {
    name: "Mehmet Kaya",
    specialty: "Elektrik Ustası",
    categoryId: "elektrik",
    rating: 4.8,
    reviewCount: 98,
    priceMin: 400,
    priceMax: 750,
    lat: 36.9012,
    lng: 30.7243,
    isOnline: true,
    verified: true,
    bio: "Panel ve tablo değişimi konusunda uzman.",
  },
  {
    name: "Ali Demir",
    specialty: "Su Tesisatçısı",
    categoryId: "su-tesisati",
    rating: 4.7,
    reviewCount: 76,
    priceMin: 350,
    priceMax: 700,
    lat: 36.8921,
    lng: 30.6985,
    isOnline: true,
    verified: true,
    bio: "Banyo ve mutfak tadilatı, su kaçağı tespiti.",
  },
  {
    name: "Mustafa Çelik",
    specialty: "Su Tesisatçısı",
    categoryId: "su-tesisati",
    rating: 4.6,
    reviewCount: 54,
    priceMin: 300,
    priceMax: 650,
    lat: 36.9156,
    lng: 30.7389,
    isOnline: false,
    verified: true,
    bio: "Doğalgaz ve su tesisatı kurulumu.",
  },
  {
    name: "Hasan Şahin",
    specialty: "Klima Teknisyeni",
    categoryId: "klima",
    rating: 4.9,
    reviewCount: 203,
    priceMin: 500,
    priceMax: 1200,
    lat: 36.8731,
    lng: 30.6847,
    isOnline: true,
    verified: true,
    bio: "Tüm marka klima kurulum, bakım ve onarımı.",
  },
  {
    name: "İbrahim Arslan",
    specialty: "Boyacı",
    categoryId: "boya",
    rating: 4.8,
    reviewCount: 167,
    priceMin: 200,
    priceMax: 500,
    lat: 36.9285,
    lng: 30.6904,
    isOnline: true,
    verified: false,
    bio: "İç ve dış cephe boyası, dekoratif kaplama.",
  },
  {
    name: "Kadir Özkan",
    specialty: "Çilingir",
    categoryId: "cilingir",
    rating: 4.9,
    reviewCount: 312,
    priceMin: 150,
    priceMax: 400,
    lat: 36.8869,
    lng: 30.7258,
    isOnline: true,
    verified: true,
    bio: "7/24 acil çilingir hizmeti. Kilit açma, değiştirme.",
  },
  {
    name: "Serkan Koç",
    specialty: "Anahtar & Çilingir",
    categoryId: "anahtar",
    rating: 4.7,
    reviewCount: 89,
    priceMin: 100,
    priceMax: 350,
    lat: 36.8654,
    lng: 30.7432,
    isOnline: false,
    verified: true,
    bio: "Anahtar kopyalama, çelik kapı kilit montajı.",
  },
  {
    name: "Emre Bulut",
    specialty: "Seramikçi",
    categoryId: "seramik",
    rating: 4.6,
    reviewCount: 43,
    priceMin: 250,
    priceMax: 600,
    lat: 36.9021,
    lng: 30.7015,
    isOnline: true,
    verified: false,
    bio: "Banyo ve mutfak seramik döşeme uzmanlığı.",
  },
  {
    name: "Cem Yıldız",
    specialty: "Genel Tadilat",
    categoryId: "diger",
    rating: 4.5,
    reviewCount: 28,
    priceMin: 300,
    priceMax: 900,
    lat: 36.8793,
    lng: 30.6631,
    isOnline: true,
    verified: false,
    bio: "Her türlü tadilat ve küçük onarım işleri.",
  },
];

router.post("/seed", async (req, res) => {
  // Destructive demo-data endpoint: development only
  if (process.env["NODE_ENV"] === "production") {
    return res.status(403).json({ error: "Seed endpoint üretim ortamında kapalıdır" });
  }
  try {
    // Clear and reseed ustas
    await db.delete(ustasTable);
    // Pre-authorized enrollment credentials: high-entropy (crypto.randomBytes),
    // stored only as a hash. Plaintext is returned once in this dev-only
    // response as the controlled test/provisioning mechanism.
    const plainCodes = SAMPLE_USTAS.map(() => generateClaimCode());
    const withClaimCodes = SAMPLE_USTAS.map((u, i) => ({
      ...u,
      claimCode: hashClaimCode(plainCodes[i]!),
    }));
    const inserted = await db.insert(ustasTable).values(withClaimCodes).returning();

    // Seed online usta locations
    await db.delete(ustaLocationsTable);
    const onlineUstas = inserted.filter((u) => u.isOnline && u.lat && u.lng);
    if (onlineUstas.length > 0) {
      await db.insert(ustaLocationsTable).values(
        onlineUstas.map((u) => ({
          ustaId: u.id,
          ustaName: u.name,
          specialty: u.specialty,
          categoryId: u.categoryId,
          lat: u.lat!,
          lng: u.lng!,
          isOnline: "true",
        })),
      );
    }

    return res.json({
      message: "Seed başarılı",
      count: inserted.length,
      // Dev-only: one-time claim codes for the seeded profiles
      claimCodes: inserted.map((u, i) => ({ ustaId: u.id, name: u.name, claimCode: plainCodes[i] })),
    });
  } catch (err) {
    req.log.error({ err }, "Seed failed");
    return res.status(500).json({ error: "Seed başarısız" });
  }
});

export default router;
