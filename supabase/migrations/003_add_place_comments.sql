CREATE TABLE IF NOT EXISTS place_comments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid        NOT NULL REFERENCES places(id)   ON DELETE CASCADE,
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        text        NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_place_comments_place_id   ON place_comments(place_id);
CREATE INDEX idx_place_comments_project_id ON place_comments(project_id);

ALTER TABLE place_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read comments"
  ON place_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = place_comments.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.invite_status = 'accepted'
    )
  );

CREATE POLICY "members can insert own comments"
  ON place_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = place_comments.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.invite_status = 'accepted'
    )
  );

CREATE POLICY "author or admin can delete comments"
  ON place_comments FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = place_comments.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('admin', 'owner')
        AND project_members.invite_status = 'accepted'
    )
  );
