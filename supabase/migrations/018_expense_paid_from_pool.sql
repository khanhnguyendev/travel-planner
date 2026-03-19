-- Add paid_from_pool flag to expenses.
-- When true: the shared budget pool pays; no individual payer gets credit.
-- When false (default): a specific member paid out of pocket (existing behaviour).

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_from_pool boolean NOT NULL DEFAULT false;
