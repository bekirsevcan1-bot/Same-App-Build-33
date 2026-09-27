import { Readable } from "stream";
import multer from "multer";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, requestsTable, ustasTable, photoUploadsTable, ustaPortfolioTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { sniffImageType, sniffVideoType } from "../lib/imageMagic";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/** Allowed image MIME types for photo uploads */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const ALLOWED_MEDIA_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]);

/** Images up to 15 MB; videos up to 80 MB. */
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024;

/** Simple in-memory rate limiter: max 20 uploads per device per hour */
const uploadWindow = new Map<string, { count: number; resetAt: number }>();
const MAX_UPLOADS_PER_HOUR = 20;

function checkUploadRate(deviceId: string): boolean {
  const now = Date.now();
  const entry = uploadWindow.get(deviceId);
  if (!entry || entry.resetAt < now) {
    uploadWindow.set(deviceId, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= MAX_UPLOADS_PER_HOUR) return false;
  entry.count++;
  return true;
}

// Memory storage: buffer validated before being written to GCS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter(_req, file, cb) {
    const ct = file.mimetype.toLowerCase().trim();
    if (ALLOWED_MEDIA_TYPES.has(ct)) {
      cb(null, true);
    } else {
      cb(new Error(`Desteklenmeyen dosya türü: ${ct}`));
    }
  },
});

/**
 * POST /storage/upload
 *
 * Server-side photo upload with ownership tracking.
 * 1. Validates MIME type from actual bytes (magic numbers), not multipart metadata
 * 2. Enforces a per-device hourly upload quota
 * 3. Persists upload ownership in photo_uploads so that only the uploading
 *    device can later link this path to a request
 */
router.post(
  "/storage/upload",
  (req, res, next) => {
    const deviceId = req.header("x-device-id");
    if (!deviceId) {
      res.status(401).json({ error: "Cihaz kimliği gerekli" });
      return;
    }
    if (!checkUploadRate(deviceId)) {
      res.status(429).json({ error: "Çok fazla yükleme isteği; lütfen bir süre bekleyin" });
      return;
    }
    next();
  },
  upload.single("photo"),
  async (req: Request, res: Response) => {
    const deviceId = req.header("x-device-id")!;

    if (!req.file) {
      res.status(400).json({ error: "Resim veya video dosyası gerekli (alan adı: photo)" });
      return;
    }

    // Validate from actual bytes — multipart metadata cannot be trusted
    const detectedType = sniffImageType(req.file.buffer) ?? sniffVideoType(req.file.buffer);
    if (!detectedType) {
      res.status(415).json({
        error: "Dosya içeriği desteklenen bir resim/video formatı değil",
      });
      return;
    }

    try {
      // Upload buffer to GCS using the server-detected MIME type
      const objectPath = await objectStorageService.uploadBuffer(req.file.buffer, detectedType);

      // Record upload ownership so only this device can link the path to a request
      await db.insert(photoUploadsTable).values({ deviceId, objectPath, claimed: false });

      res.json({ objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error uploading file to GCS");
      res.status(500).json({ error: "Medya yüklenemedi" });
    }
  },
);

/**
 * GET /storage/objects/*path
 *
 * Serve uploaded image files.
 * Authorization: the requesting device must be the owner or assigned usta
 * of the request that contains this objectPath in its photos array.
 * Resolves assignedUstaId to the usta's ownerDeviceId (mirrors computeCanManage).
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    res.status(401).json({ error: "Cihaz kimliği gerekli" });
    return;
  }

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Authorization: find a request that contains this photo and check ownership
    const allRequests = await db.select().from(requestsTable);
    const owningRequest = allRequests.find(
      (r) => Array.isArray(r.photos) && r.photos.includes(objectPath),
    );

    if (!owningRequest) {
      // Object exists but isn't linked to any request — deny by default
      res.status(403).json({ error: "Erişim izniniz yok" });
      return;
    }

    const isOwner = owningRequest.ownerDeviceId === deviceId;

    // assignedUstaId is a record ID, not a device ID — look up the usta's ownerDeviceId
    let isAssignedUsta = false;
    if (!isOwner && owningRequest.assignedUstaId != null) {
      const ustaId = parseInt(owningRequest.assignedUstaId);
      if (!Number.isNaN(ustaId)) {
        const [usta] = await db.select().from(ustasTable).where(eq(ustasTable.id, ustaId));
        isAssignedUsta = !!usta && !!usta.ownerDeviceId && usta.ownerDeviceId === deviceId;
      }
    }

    if (!isOwner && !isAssignedUsta) {
      res.status(403).json({ error: "Bu fotoğrafa erişim izniniz yok" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (lk === "content-type") {
        const ct = value.toLowerCase();
        if (!ALLOWED_MEDIA_TYPES.has(ct)) {
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("Content-Disposition", "attachment");
          return;
        }
      }
      res.setHeader(key, value);
    });
    // Prevent browsers from executing stored content
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'");

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Dosya bulunamadı" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Dosya sunulamadı" });
  }
});

// Portfolio images are intentionally public; request photos remain protected above.
router.get("/storage/portfolio/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const [portfolio] = await db.select({ objectPath: ustaPortfolioTable.objectPath }).from(ustaPortfolioTable).where(eq(ustaPortfolioTable.objectPath, objectPath));
    if (!portfolio) return res.status(404).json({ error: "Galeri görseli bulunamadı" });
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile, 86400);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return res.status(404).json({ error: "Dosya bulunamadı" });
    req.log.error({ err: error }, "Error serving portfolio object");
    return res.status(500).json({ error: "Galeri görseli sunulamadı" });
  }
});

// Multer error handler (file size / type rejection)
router.use(
  (err: Error, _req: Request, res: Response, next: (e?: unknown) => void) => {
    if (err instanceof multer.MulterError || err.message.startsWith("Desteklenmeyen")) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  },
);

export default router;
