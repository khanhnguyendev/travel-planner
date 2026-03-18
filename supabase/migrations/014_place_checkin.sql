-- Add actual check-in / check-out timestamps to places
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS actual_checkin_at  timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_checkout_at timestamptz DEFAULT NULL;
