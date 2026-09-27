#!/usr/bin/env node
/**
 * Registration consent integration checks.
 * Requires the development API and DATABASE_URL to be available.
 *
 * Run: pnpm --filter @workspace/api-server test:registration-consent
 */
import { createRequire } from "node:module";

const BASE = process.argv[2] ?? "http://localhost:8080/api";
// Resolve the database client's direct dependency from the workspace DB package.
const requireFromDb = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
const pg = requireFromDb("pg");
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const testEmails = [];
const testCraftsmanPhones = [];
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) console.log(`PASS ${name}`);
  else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  }
}

async function request(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const cases = [
  {
    name: "müşteri",
    path: "/register/customer",
    body: () => ({
      name: "Consent Customer",
      phone: `0500${runId.slice(-7)}`,
      email: `consent-customer-${runId}@example.invalid`,
      password: "integration-password",
      district: "Kepez",
    }),
  },
  {
    name: "usta",
    path: "/register/craftsman",
    body: () => ({
      name: "Consent Craftsman",
      phone: `0511${runId.slice(-7)}`,
      email: `consent-craftsman-${runId}@example.invalid`,
      password: "integration-password",
      specialty: "Elektrik",
      district: "Muratpaşa",
      experience: 5,
    }),
  },
  {
    name: "site yönetimi",
    path: "/register/site-yonetimi",
    body: () => ({
      name: "Consent Site Manager",
      email: `consent-site-${runId}@example.invalid`,
      password: "integration-password",
      siteName: "Consent Test Sitesi",
      siteAddress: "Test Mahallesi 1",
      district: "Konyaaltı",
      unitCount: 12,
    }),
  },
  {
    name: "nakliyeci",
    path: "/register/nakliyeci",
    body: () => ({
      name: "Consent Carrier",
      phone: `0522${runId.slice(-7)}`,
      email: `consent-carrier-${runId}@example.invalid`,
      password: "integration-password",
      vehicleType: "Kamyonet",
      district: "Kepez",
      experience: 3,
    }),
  },
];

try {
  for (const registration of cases) {
    const missing = registration.body();
    check(
      `${registration.name}: eksik KVKK onayı reddedilir`,
      (await request(registration.path, missing)).status === 400,
    );

    const rejected = registration.body();
    rejected.kvkkConsent = false;
    check(
      `${registration.name}: false KVKK onayı reddedilir`,
      (await request(registration.path, rejected)).status === 400,
    );

    const accepted = registration.body();
    accepted.kvkkConsent = true;
    testEmails.push(accepted.email);
    const created = await request(registration.path, accepted);
    check(`${registration.name}: true KVKK onayı kabul edilir`, created.status === 201, String(created.status));
    if (registration.name === "usta" && created.status === 201) {
      testCraftsmanPhones.push(accepted.phone);
    }

    const audit = await pool.query(
      `SELECT kvkk_consent, kvkk_consent_at, kvkk_consent_version
       FROM registrations
       WHERE email = $1`,
      [accepted.email],
    );
    const record = audit.rows[0];
    check(
      `${registration.name}: onay denetim bilgisi saklanır`,
      record?.kvkk_consent === true
        && record?.kvkk_consent_at instanceof Date
        && typeof record?.kvkk_consent_version === "string"
        && record.kvkk_consent_version.length > 0,
    );
  }

  const admin = {
    name: "Consent Admin",
    email: `consent-admin-${runId}@example.invalid`,
    password: "integration-password",
    adminCode: "not-a-valid-admin-code",
  };
  check("yönetici: eksik KVKK onayı reddedilir", (await request("/register/admin", admin)).status === 400);
  check(
    "yönetici: false KVKK onayı reddedilir",
    (await request("/register/admin", { ...admin, kvkkConsent: false })).status === 400,
  );
  const acceptedAdmin = await request("/register/admin", { ...admin, kvkkConsent: true });
  check(
    "yönetici: true KVKK onayı sonraki yetkilendirme adımına ulaşır",
    acceptedAdmin.status === 403 || acceptedAdmin.status === 503,
    String(acceptedAdmin.status),
  );
} finally {
  if (testEmails.length > 0) {
    await pool.query("DELETE FROM registrations WHERE email = ANY($1::text[])", [testEmails]);
  }
  if (testCraftsmanPhones.length > 0) {
    await pool.query("DELETE FROM ustas WHERE phone = ANY($1::text[])", [testCraftsmanPhones]);
  }
  await pool.end();
}

console.log(failures === 0 ? "\nALL CONSENT TESTS PASSED" : `\n${failures} CONSENT TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);