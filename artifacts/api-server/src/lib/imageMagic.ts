/**
 * Lightweight magic-byte image validation.
 * Returns the canonical MIME type if the buffer starts with a known image
 * signature, or null if the content does not match any known image format.
 * This is separate from—and more reliable than—multipart metadata.
 */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF87a / GIF89a: 47 49 46 38
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "image/webp";
  }
  // HEIC/HEIF: ISO base media file format — ftyp box at offset 4
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.slice(8, 12).toString("ascii").toLowerCase();
    const heicBrands = ["heic", "heif", "heis", "heix", "heim", "hevm",
                        "hevs", "mif1", "avif", "avis"];
    if (heicBrands.includes(brand)) return "image/heic";
  }
  return null;
}

/** Detect the common video containers accepted by the upload route. */
export function sniffVideoType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // MP4/MOV: ISO base media file format (ftyp at offset 4).
  if (buf.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.slice(8, 12).toString("ascii").toLowerCase();
    if (["isom", "iso2", "mp41", "mp42", "avc1", "mmp4", "qt  "].includes(brand)) {
      return brand === "qt  " ? "video/quicktime" : "video/mp4";
    }
  }
  // WebM/Matroska EBML header.
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}
