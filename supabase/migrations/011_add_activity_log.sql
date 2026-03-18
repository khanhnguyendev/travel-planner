-- 011_add_activity_log.sql
-- Project activity feed: records member actions for display and future notifications.

CREATE TABLE project_activity (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  action      text        NOT NULL,  -- e.g. 'place.add', 'comment.add', 'vote.upvote'
  entity_type text,                  -- 'place', 'comment', 'vote', 'expense', 'category'
  entity_id   text,                  -- UUID or identifier of the affected entity
  meta        jsonb,                 -- additional context (place name, category name, etc.)
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_activity_project_created_idx
  ON project_activity(project_id, created_at DESC);

ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;

-- Members (any accepted role) can read their project's activity
CREATE POLICY "activity: members can read"
  ON project_activity FOR SELECT
  USING (is_project_member(project_id));

-- Inserts are performed via service-role (admin client) in server actions
-- No authenticated-user insert policy is needed
