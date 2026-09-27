-- Adds the server-recorded consent audit fields used by all registration routes.
-- IF NOT EXISTS makes this safe for databases already updated via Drizzle push.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS kvkk_consent_at TIMESTAMPTZ;

ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS kvkk_consent_version TEXT;