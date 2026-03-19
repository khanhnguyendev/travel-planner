-- Migration 016: Budget contributions — allow multiple members to fund the budget
-- Each "Add income" now records who contributed how much, so balance calculations
-- can credit the right person rather than a single budget_payer_user_id.

CREATE TABLE IF NOT EXISTS budget_contributions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      numeric(12, 2) NOT NULL,
  currency    text NOT NULL DEFAULT 'VND',
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_contributions_trip_id
  ON budget_contributions(trip_id);
