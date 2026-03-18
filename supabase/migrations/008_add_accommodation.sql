-- 008_add_accommodation.sql
-- Add category_type to distinguish accommodation from general categories,
-- and add checkout_date to places for accommodation check-out tracking.

ALTER TABLE categories
  ADD COLUMN category_type text NOT NULL DEFAULT 'general';

ALTER TABLE places
  ADD COLUMN checkout_date date;
