---
name: Device-ownership authorization
description: Why this auth-less app uses device ids + hashed claim codes, and the invariants to preserve
---

**Decision:** the app deliberately has no user accounts. Ownership of records is bound to a persistent per-device id sent as a header, and usta profiles are enrolled via a one-time high-entropy claim code delivered only at provisioning (registration response, or dev-only seed output).

**Why:** without these, review flagged broken access control repeatedly: exposed ownership tokens are bearer credentials, open first-claim is a takeover vector, short/Math.random codes are brute-forceable, and client-supplied state (initial status, locations) can forge data.

**Invariants to preserve when extending:**
- Credentials (device ids, claim codes) never appear in public payloads; expose server-computed capability flags instead.
- Claim codes: crypto-generated, stored hashed, verified timing-safe, rate-limited.
- Ownership writes are atomic conditional updates; lifecycle transitions and initial states are server-enforced.
- Availability is mirrored in two stores (usta record + map location record) — keep them in sync, and gate location writes on ownership.
