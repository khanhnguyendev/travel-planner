-- 010_add_expense_category.sql
-- Add an optional category field to expenses for quick classification.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category text;
