-- Migration 017: Add visit_date_end to places for multi-day scheduling.
-- When both visit_date and visit_date_end are set the place spans multiple days.
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS visit_date_end text DEFAULT NULL;
