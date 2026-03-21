-- ============================================================
-- 023_add_trip_locations.sql
-- Add locations array to trips for tagging which areas the trip covers.
-- ============================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS locations text[] NOT NULL DEFAULT '{}';
