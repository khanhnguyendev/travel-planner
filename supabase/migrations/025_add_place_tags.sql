-- ============================================================
-- 025_add_place_tags.sql
-- Junction table linking places to tags (many-to-many).
-- ============================================================

CREATE TABLE place_tags (
  place_id uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (place_id, tag_id)
);

CREATE INDEX place_tags_tag_id_idx ON place_tags (tag_id);

ALTER TABLE place_tags ENABLE ROW LEVEL SECURITY;

-- Access is inferred via the tag's trip membership
CREATE POLICY "place_tags: public trip or member"
  ON place_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_id
        AND (
          is_trip_member(t.trip_id)
          OR EXISTS (SELECT 1 FROM trips WHERE id = t.trip_id AND visibility = 'public')
        )
    )
  );
