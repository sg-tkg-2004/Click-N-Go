-- Align existing database with schema.sql: _availabilities.is_booked (required by booking flow).
-- Run once against your DB, e.g. psql -f backend/db/migrations/001_availabilities_add_is_booked.sql

ALTER TABLE _availabilities
  ADD COLUMN IF NOT EXISTS is_booked BOOLEAN NOT NULL DEFAULT false;

-- View columns are fixed at creation time; refresh so `availabilities` exposes is_booked
CREATE OR REPLACE VIEW availabilities AS
  SELECT * FROM _availabilities WHERE is_deleted = false;
