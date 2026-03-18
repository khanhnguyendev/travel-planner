-- 007_add_place_note.sql
-- Add an editor-only note field to places.
ALTER TABLE places ADD COLUMN note text;
