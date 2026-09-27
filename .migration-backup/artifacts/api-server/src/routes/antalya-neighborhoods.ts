import { Router } from "express";

const router = Router();
const SOURCE_URL = "https://raw.githubusercontent.com/berke-turk/il-ilce-mahalle-icisleri-data/master/mahalleler.json";
const CACHE_MS = 24 * 60 * 60 * 1000;
let cache: { districts: Record<string, string[]>; fetchedAt: number } | null = null;

function normalizeDistrict(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("tr-TR");
}

router.get("/antalya-neighborhoods", async (req, res) => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return res.json({ ...cache, source: "İçişleri Bakanlığı veri seti önbelleği" });
  }

  try {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`Kaynak veri ${response.status} döndürdü`);
    const rows = await response.json() as Array<{ mahalle?: string; detay?: string }>;
    const districts: Record<string, string[]> = {};

    for (const row of rows) {
      const parts = row.detay?.split("->").map((part) => part.trim()) ?? [];
      if (parts.length < 2 || normalizeDistrict(parts[0]) !== "antalya") continue;
      const district = parts[1];
      const neighborhood = (row.mahalle ?? "").replace(/\s+(Mah\.?|Mahallesi)$/i, "").trim();
      if (!neighborhood) continue;
      districts[district] ??= [];
      if (!districts[district].includes(neighborhood)) districts[district].push(neighborhood);
    }

    if (Object.keys(districts).length !== 19) {
      throw new Error(`Antalya için 19 ilçe yerine ${Object.keys(districts).length} ilçe geldi`);
    }

    for (const names of Object.values(districts)) names.sort((a, b) => a.localeCompare(b, "tr"));
    cache = { districts, fetchedAt: Date.now() };
    return res.json({ ...cache, source: "İçişleri Bakanlığı veri seti" });
  } catch (error) {
    req.log.error({ error }, "Antalya mahalle listesi alınamadı");
    if (cache) return res.json({ ...cache, source: "önbellek" });
    return res.status(503).json({ error: "Antalya mahalle listesi şu anda alınamıyor" });
  }
});

export default router;