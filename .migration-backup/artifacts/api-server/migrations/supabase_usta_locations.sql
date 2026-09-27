-- Run this in your Supabase Dashboard → SQL Editor
-- Required for Realtime location sync to work.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS usta_locations (
  usta_id     int PRIMARY KEY,
  usta_name   text,
  specialty   text,
  category_id text,
  lat         float8,
  lng         float8,
  heading     float8,
  is_online   text,
  updated_at  timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security (required before granting any policies)
ALTER TABLE usta_locations ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone (anon) to READ online usta locations — no writes via anon key
--    All writes go exclusively through the API server's service-role connector.
CREATE POLICY "Public read-only access to online locations"
  ON usta_locations
  FOR SELECT
  TO anon
  USING (is_online = 'true');

-- 4. Enable Realtime for this table so Expo subscriptions receive push updates
ALTER PUBLICATION supabase_realtime ADD TABLE usta_locations;
