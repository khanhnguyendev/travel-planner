ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget        numeric(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS budget_currency text          DEFAULT 'USD';
