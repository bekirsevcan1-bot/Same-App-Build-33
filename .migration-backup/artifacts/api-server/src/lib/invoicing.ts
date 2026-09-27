import { logger } from "./logger";

type Customer = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
};

type InvoiceInput = {
  userId: string;
  transactionId: string;
  amount: number;
  customer: Customer;
};

function config() {
  return {
    provider: (process.env.E_ARCHIVE_PROVIDER ?? "").toLowerCase(),
    baseUrl: (process.env.E_ARCHIVE_API_URL ?? "").replace(/\/$/, ""),
    token: process.env.E_ARCHIVE_API_TOKEN ?? "",
  };
}

export function isInvoicingConfigured() {
  const current = config();
  return ["parasut", "bizimhesap"].includes(current.provider) && Boolean(current.baseUrl && current.token);
}

export async function createAndSendEArchiveInvoice(input: InvoiceInput) {
  const current = config();
  if (!isInvoicingConfigured()) {
    throw new Error("E_ARCHIVE_PROVIDER, E_ARCHIVE_API_URL ve E_ARCHIVE_API_TOKEN yapılandırılmadı");
  }
  if (!input.customer.email) throw new Error("Fatura için kullanıcının e-posta adresi bulunamadı");

  // Provider-specific adapters can map this stable payload without ever
  // storing card data. Both supported providers receive the same business
  // facts; their account-side API URL determines the final resource shape.
  const payload = {
    external_reference: input.transactionId,
    currency: "TRY",
    total: input.amount.toFixed(2),
    vat_included: true,
    description: "Usta Cepte aylık kullanım aboneliği",
    customer: {
      name: input.customer.name ?? "Usta Cepte kullanıcısı",
      email: input.customer.email,
      phone: input.customer.phone ?? null,
      address: input.customer.address ?? null,
      tax_id: input.customer.taxId ?? null,
    },
    send_email: false,
  };
  const headers = { Authorization: `Bearer ${current.token}`, "Content-Type": "application/json" };
  const created = await fetch(`${current.baseUrl}/invoices`, { method: "POST", headers, body: JSON.stringify(payload) });
  const createdText = await created.text();
  if (!created.ok) throw new Error(`${current.provider} fatura oluşturma hatası (${created.status}): ${createdText.slice(0, 300)}`);
  let createdBody: { id?: string; invoice_id?: string } = {};
  try { createdBody = JSON.parse(createdText) as typeof createdBody; } catch { /* provider may return an empty body */ }
  const invoiceId = createdBody.id ?? createdBody.invoice_id ?? input.transactionId;

  const sent = await fetch(`${current.baseUrl}/invoices/${encodeURIComponent(invoiceId)}/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: input.customer.email }),
  });
  const sentText = await sent.text();
  if (!sent.ok) throw new Error(`${current.provider} e-posta gönderme hatası (${sent.status}): ${sentText.slice(0, 300)}`);
  logger.info({ provider: current.provider, invoiceId, email: input.customer.email }, "E-arşiv invoice created and emailed");
  return { provider: current.provider, invoiceId, email: input.customer.email };
}