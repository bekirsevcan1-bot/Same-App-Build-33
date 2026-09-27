import { Router, type RequestHandler } from "express";
import crypto from "crypto";
import { db, registrations } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured for admin sessions");
  }
  return secret ?? "usta-cepte-development-session-secret";
}

function signAdminSession(payload: { id: number; email: string; role: string; exp: number }): string {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", sessionSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifyAdminSession(token: string): { id: number; email: string; role: "admin"; exp: number } | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(encodedPayload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      id?: number;
      email?: string;
      role?: string;
      exp?: number;
    };
    const exp = payload.exp;
    if (!Number.isInteger(payload.id) || typeof payload.email !== "string" || payload.role !== "admin" || typeof exp !== "number" || !Number.isInteger(exp)) return null;
    if (exp <= Math.floor(Date.now() / 1000)) return null;
    const id = payload.id as number;
    const email = payload.email;
    return { id, email, role: "admin", exp };
  } catch {
    return null;
  }
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const principal = token ? verifyAdminSession(token) : null;
  if (!principal) {
    res.status(401).json({ error: "Yönetici oturumu gerekli" });
    return;
  }
  res.locals.admin = principal;
  next();
};

function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

export async function loginHandler(req: Parameters<import("express").RequestHandler>[0], res: Parameters<import("express").RequestHandler>[1]) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ success: false, message: "E-posta ve şifre zorunludur." });

  try {
    const [account] = await db.select({
      id: registrations.id,
      name: registrations.name,
      email: registrations.email,
      role: registrations.role,
      passwordHash: registrations.passwordHash,
      isBlocked: registrations.isBlocked,
    }).from(registrations).where(eq(registrations.email, email)).limit(1);
    if (!account || account.isBlocked || !verifyPassword(password, account.passwordHash)) {
      return res.status(401).json({ success: false, message: "E-posta veya şifre hatalı." });
    }
    return res.json({ success: true, id: account.id, name: account.name, email: account.email, role: account.role, active: true });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    return res.status(500).json({ success: false, message: "Giriş yapılamadı." });
  }
}

async function adminLoginHandler(req: Parameters<import("express").RequestHandler>[0], res: Parameters<import("express").RequestHandler>[1]) {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) return res.status(400).json({ success: false, message: "E-posta ve şifre zorunludur." });

  try {
    const [account] = await db.select({
      id: registrations.id,
      name: registrations.name,
      email: registrations.email,
      role: registrations.role,
      passwordHash: registrations.passwordHash,
      isBlocked: registrations.isBlocked,
    }).from(registrations).where(eq(registrations.email, email)).limit(1);
    if (!account || account.role !== "admin" || account.isBlocked || !verifyPassword(password, account.passwordHash)) {
      return res.status(401).json({ success: false, message: "Yönetici bilgileri hatalı." });
    }
    const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
    const token = signAdminSession({ id: account.id, email: account.email, role: account.role, exp });
    return res.json({ success: true, token, expiresAt: new Date(exp * 1000).toISOString(), admin: { id: account.id, name: account.name, email: account.email } });
  } catch (err) {
    req.log.error({ err }, "Admin login failed");
    return res.status(500).json({ success: false, message: "Yönetici girişi yapılamadı." });
  }
}

router.post("/login", loginHandler);
router.post("/admin-login", adminLoginHandler);

export default router;