-- Link expenses to an optional place in the same trip
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS place_id uuid REFERENCES places(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_place_id ON expenses(place_id);
