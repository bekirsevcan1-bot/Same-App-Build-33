import crypto from "crypto";

/**
 * Claim-code credentials for usta profile enrollment.
 * - Generated with crypto.randomBytes (high entropy, not Math.random).
 * - Stored only as an unkeyed SHA-256 digest (`sha256$<hex>`); the plaintext
 *   is shown once at provisioning time and never returned by public reads.
 * - Verified with timing-safe comparison.
 */

export function generateClaimCode(): string {
  // 8 random bytes -> 16 hex chars (~64 bits of entropy)
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export function hashClaimCode(code: string): string {
  const digest = crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  return `sha256$${digest}`;
}

export function verifyClaimCode(code: string, stored: string | null): boolean {
  if (!stored) return false;
  const expected = stored.startsWith("sha256$") ? stored : hashClaimCode(stored);
  const provided = hashClaimCode(code);
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// ---------------------------------------------------------------------------
// In-memory rate limiter for claim attempts (per usta id + caller key).
// 5 failed attempts -> 15 minute lockout.
// ---------------------------------------------------------------------------

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Entry = { failures: number; lockedUntil: number };
const attempts = new Map<string, Entry>();

function key(ustaId: number, caller: string): string {
  return `${ustaId}|${caller}`;
}

export function isClaimLocked(ustaId: number, caller: string): boolean {
  const e = attempts.get(key(ustaId, caller));
  if (!e) return false;
  if (e.lockedUntil > Date.now()) return true;
  if (e.lockedUntil !== 0) attempts.delete(key(ustaId, caller));
  return false;
}

export function recordClaimFailure(ustaId: number, caller: string): void {
  const k = key(ustaId, caller);
  const e = attempts.get(k) ?? { failures: 0, lockedUntil: 0 };
  e.failures += 1;
  if (e.failures >= MAX_FAILURES) {
    e.lockedUntil = Date.now() + LOCKOUT_MS;
    e.failures = 0;
  }
  attempts.set(k, e);
}

export function clearClaimFailures(ustaId: number, caller: string): void {
  attempts.delete(key(ustaId, caller));
}
