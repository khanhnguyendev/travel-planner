-- Add visit schedule and backup plan to places

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS visit_date       date,
  ADD COLUMN IF NOT EXISTS visit_time_from  time,
  ADD COLUMN IF NOT EXISTS visit_time_to    time,
  ADD COLUMN IF NOT EXISTS backup_place_id  uuid REFERENCES places(id) ON DELETE SET NULL;

-- Index for backup_place_id lookups
CREATE INDEX IF NOT EXISTS places_backup_place_id_idx ON places(backup_place_id);

-- Prevent a place from being its own backup
ALTER TABLE places
  ADD CONSTRAINT places_backup_not_self CHECK (backup_place_id <> id);
