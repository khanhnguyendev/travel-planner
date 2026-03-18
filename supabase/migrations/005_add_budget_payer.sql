-- Migration 005: Add budget payer (fund owner) to projects
-- Also reset budget_currency default to VND and clear stale budget data
-- so the new "payer required" flow starts clean.

UPDATE projects
  SET budget = NULL,
      budget_currency = 'VND',
      updated_at = now();

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget_payer_user_id uuid
    REFERENCES profiles(id)
    ON DELETE SET NULL;

-- Update default for new projects
ALTER TABLE projects
  ALTER COLUMN budget_currency SET DEFAULT 'VND';
