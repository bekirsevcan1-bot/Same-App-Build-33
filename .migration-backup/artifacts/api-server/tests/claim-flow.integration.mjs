#!/usr/bin/env node
/**
 * Integration tests for the usta profile claim / ownership flow.
 * Requires the dev API server to be running (NODE_ENV=development).
 *
 * Run: node tests/claim-flow.integration.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:80/api";

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`PASS ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name} ${extra}`);
  }
}

async function req(method, path, { device, code, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (device) headers["x-device-id"] = device;
  if (code) headers["x-claim-code"] = code;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

// 1. Seed (dev-only) returns one-time claim codes
const seed = await req("POST", "/seed");
check("seed succeeds in dev", seed.status === 200);
const codes = seed.json?.claimCodes ?? [];
check("seed returns claim codes", codes.length > 0);
const { ustaId, claimCode } = codes[0];
check("claim code is high entropy (16 hex chars)", /^[0-9A-F]{16}$/.test(claimCode));

// 2. Public reads never expose credentials
const pub = await req("GET", `/ustas/${ustaId}`);
check("public read has no claimCode/ownerDeviceId",
  pub.json && !("claimCode" in pub.json) && !("ownerDeviceId" in pub.json));
check("unclaimed profile is claimable, not manageable",
  pub.json?.claimable === true && pub.json?.canManage === false);

// 3. Claim attempts
const noCode = await req("PUT", `/ustas/${ustaId}/status`, { device: "it-dev-a", body: { isOnline: true } });
check("claim without code rejected (403)", noCode.status === 403);

const wrong = await req("PUT", `/ustas/${ustaId}/status`, { device: "it-dev-a", code: "0000000000000000", body: { isOnline: true } });
check("claim with wrong code rejected (403)", wrong.status === 403);

const ok = await req("PUT", `/ustas/${ustaId}/status`, { device: "it-dev-a", code: claimCode, body: { isOnline: true } });
check("legitimate claim succeeds", ok.status === 200 && ok.json?.claimed === true && ok.json?.canManage === true);

// 4. Replayed claim by another device cannot take over
const replay = await req("PUT", `/ustas/${ustaId}/status`, { device: "it-dev-b", code: claimCode, body: { isOnline: false } });
check("replayed code from other device rejected (403)", replay.status === 403);

const owner = await req("PUT", `/ustas/${ustaId}/status`, { device: "it-dev-a", body: { isOnline: false } });
check("owner manages without code", owner.status === 200 && owner.json?.isOnline === false);

// 5. Rate limiting: hammer a second profile with bad codes
const target2 = codes[1].ustaId;
let lastStatus = 0;
for (let i = 0; i < 6; i++) {
  const r = await req("PUT", `/ustas/${target2}/status`, { device: "it-brute", code: "FFFFFFFFFFFFFFFF", body: { isOnline: true } });
  lastStatus = r.status;
}
check("brute force locked out (429)", lastStatus === 429, `got ${lastStatus}`);

// 6. Craftsman registration provisions a profile + one-time code
const email = `it-usta-${Date.now()}@example.com`;
const reg = await req("POST", "/register/craftsman", {
  body: { name: "IT Usta", phone: "5550001", email, password: "pw-integration-1", specialty: "Boyacı", categoryId: "boya", district: "Muratpaşa" },
});
check("registration returns ustaId + one-time claim code",
  reg.status === 201 && reg.json?.ustaId && /^[0-9A-F]{16}$/.test(reg.json?.claimCode ?? ""));

if (reg.json?.ustaId) {
  const claimReg = await req("PUT", `/ustas/${reg.json.ustaId}/status`, { device: "it-dev-c", code: reg.json.claimCode, body: { isOnline: true } });
  check("registered usta claims own profile", claimReg.status === 200 && claimReg.json?.claimed === true);
}

console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
