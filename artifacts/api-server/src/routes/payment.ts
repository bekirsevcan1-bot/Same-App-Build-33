import { Router } from "express";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../lib/logger";
import { supabaseProxy } from "../lib/supabase";
import { createAndSendEArchiveInvoice, isInvoicingConfigured } from "../lib/invoicing";

const router = Router();
const MONTHLY_FEE = 3000;
const SUBSCRIPTION_DAYS = 30;

function providerName() {
  return (process.env.PAYMENT_PROVIDER ?? "").toLowerCase();
}

function referenceFor(userId: string) {
  const secret = process.env.SUBSCRIPTION_REFERENCE_SECRET ?? "usta-cepte-reference";
  return `UC-${createHmac("sha256", secret).update(userId).digest("hex").slice(0, 10).toUpperCase()}`;
}

async function supabaseJson(path: string, options: Parameters<typeof supabaseProxy>[1] = {}) {
  const response = await supabaseProxy(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}

function validUserId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 4 && value.length <= 160;
}

router.get("/subscription", async (req, res) => {
  const userId = String(req.query.user_id ?? req.header("x-device-id") ?? "");
  if (!validUserId(userId)) return res.status(400).json({ error: "Geçerli user_id gerekli" });
  try {
    const { response, data } = await supabaseJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,subscription_status,subscription_end_date,monthly_fee&limit=1`);
    if (!response.ok) throw new Error(`Supabase profile read failed: ${response.status}`);
    const profile = Array.isArray(data) ? data[0] : null;
    const endDate = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const active = profile?.subscription_status === "active" && !!endDate && endDate.getTime() > Date.now();
    return res.json({
      userId,
      active,
      subscriptionStatus: active ? "active" : (profile?.subscription_status ?? "inactive"),
      subscriptionEndDate: profile?.subscription_end_date ?? null,
      monthlyFee: Number(profile?.monthly_fee ?? MONTHLY_FEE),
      referenceCode: referenceFor(userId),
    });
  } catch (err) {
    req.log.error({ err, userId }, "Subscription status lookup failed");
    // Fail closed for service access: the UI can still explain the required
    // subscription, while payment activation never succeeds without storage.
    return res.json({
      userId,
      active: false,
      subscriptionStatus: "inactive",
      subscriptionEndDate: null,
      monthlyFee: MONTHLY_FEE,
      referenceCode: referenceFor(userId),
      billingAvailable: false,
    });
  }
});

router.get("/pay/config", (req, res) => {
  const userId = String(req.query.user_id ?? "");
  if (!validUserId(userId)) return res.status(400).json({ error: "Geçerli user_id gerekli" });
  const provider = providerName();
  if (!provider || !["paytr", "iyzico"].includes(provider)) {
    return res.status(503).json({ configured: false, error: "Kart ödeme sağlayıcısı henüz yapılandırılmadı" });
  }
  return res.json({
    configured: true,
    provider,
    amount: MONTHLY_FEE,
    currency: "TRY",
    vatIncluded: true,
    userId,
  });
});

router.get("/pay", (req, res) => {
  const userId = String(req.query.user_id ?? "");
  if (!validUserId(userId)) return res.status(400).send("Geçerli user_id gerekli");
  const provider = providerName();
  if (!provider || !["paytr", "iyzico"].includes(provider)) {
    return res.status(503).send("Kart ödeme sağlayıcısı henüz yapılandırılmadı.");
  }
  return res.status(501).send(`${provider} ödeme oturumu için sağlayıcı kimlik bilgileri gereklidir.`);
});

router.get("/bank-transfer", (req, res) => {
  const userId = String(req.query.user_id ?? "");
  if (!validUserId(userId)) return res.status(400).json({ error: "Geçerli user_id gerekli" });
  return res.json({
    amount: MONTHLY_FEE,
    currency: "TRY",
    vatIncluded: true,
    companyName: process.env.SUBSCRIPTION_COMPANY_NAME ?? "Usta Cepte",
    iban: process.env.SUBSCRIPTION_IBAN ?? "",
    referenceCode: referenceFor(userId),
    configured: Boolean(process.env.SUBSCRIPTION_IBAN),
  });
});

router.post("/payment/callback", async (req, res) => {
  const signature = req.header("x-payment-signature") ?? "";
  const secret = process.env.PAYMENT_CALLBACK_SECRET;
  if (!secret) return res.status(503).json({ error: "Ödeme callback güvenliği yapılandırılmadı" });
  const expected = createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: "Geçersiz ödeme imzası" });

  const { user_id: userId, transaction_id: transactionId, status, payment_method: paymentMethod = "card", amount } = req.body as Record<string, unknown>;
  if (!validUserId(userId) || typeof transactionId !== "string" || status !== "success" || Number(amount) !== MONTHLY_FEE) {
    return res.status(400).json({ error: "Geçersiz ödeme bildirimi" });
  }
  if (paymentMethod !== "card" && paymentMethod !== "bank_transfer") return res.status(400).json({ error: "Geçersiz ödeme yöntemi" });

  try {
    const existing = await supabaseJson(`/rest/v1/payment_history?transaction_id=eq.${encodeURIComponent(transactionId)}&select=id&limit=1`);
    if (!existing.response.ok) throw new Error(`Payment lookup failed: ${existing.response.status}`);
    if (Array.isArray(existing.data) && existing.data.length > 0) return res.json({ ok: true, duplicate: true });

    const endDate = new Date(Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const profile = await supabaseJson(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,name,email,phone,address,tax_id`, {});
    if (!profile.response.ok) throw new Error(`Profile read failed: ${profile.response.status}`);
    const customer = (Array.isArray(profile.data) ? profile.data[0] : null) as { name?: string; email?: string; phone?: string; address?: string; tax_id?: string } | null;
    const activated = await supabaseJson("/rest/v1/profiles", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: userId, subscription_status: "active", subscription_end_date: endDate, monthly_fee: MONTHLY_FEE, updated_at: new Date().toISOString() }),
    });
    if (!activated.response.ok) throw new Error(`Profile activation failed: ${activated.response.status}`);
    const history = await supabaseJson("/rest/v1/payment_history", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, amount: MONTHLY_FEE, payment_method: paymentMethod, status: "success", transaction_id: transactionId }),
    });
    if (!history.response.ok) throw new Error(`Payment history insert failed: ${history.response.status}`);
    const invoicePayload = { user_id: userId, transaction_id: transactionId, provider: process.env.E_ARCHIVE_PROVIDER ?? "unconfigured", customer_email: customer?.email ?? null, status: "pending" };
    await supabaseJson("/rest/v1/invoice_records", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(invoicePayload),
    });
    try {
      const invoice = await createAndSendEArchiveInvoice({
        userId,
        transactionId,
        amount: MONTHLY_FEE,
        customer: { name: customer?.name, email: customer?.email, phone: customer?.phone, address: customer?.address, taxId: customer?.tax_id },
      });
      await supabaseJson(`/rest/v1/invoice_records?transaction_id=eq.${encodeURIComponent(transactionId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "sent", provider: invoice.provider, provider_invoice_id: invoice.invoiceId, sent_at: new Date().toISOString(), error_message: null }),
      });
      return res.json({ ok: true, subscriptionEndDate: endDate, invoiceStatus: "sent", invoiceId: invoice.invoiceId });
    } catch (invoiceError) {
      const errorMessage = invoiceError instanceof Error ? invoiceError.message : "Fatura oluşturulamadı";
      await supabaseJson(`/rest/v1/invoice_records?transaction_id=eq.${encodeURIComponent(transactionId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "failed", error_message: errorMessage }),
      });
      logger.error({ err: invoiceError, userId, transactionId, configured: isInvoicingConfigured() }, "Payment accepted but e-archive invoice/email failed");
      return res.status(502).json({ ok: false, paymentAccepted: true, invoiceStatus: "failed", error: "Ödeme alındı ancak e-arşiv fatura e-postası gönderilemedi" });
    }
  } catch (err) {
    logger.error({ err, userId, transactionId }, "Payment callback failed");
    return res.status(502).json({ error: "Ödeme onayı işlenemedi" });
  }
});

export default router;