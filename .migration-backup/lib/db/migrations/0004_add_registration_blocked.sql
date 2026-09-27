ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;