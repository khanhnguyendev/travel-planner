-- ============================================================
-- 024_add_tags.sql
-- Trip-scoped tags. Auto-generated from trip locations (is_auto=true)
-- or manually created by members. Tags can be assigned to places
-- via place_tags (see 025).
-- ============================================================

CREATE TABLE tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        NULL,
  is_auto    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tags_trip_name UNIQUE (trip_id, name)
);

CREATE INDEX tags_trip_id_idx ON tags (trip_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: public trip or member"
  ON tags FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );
