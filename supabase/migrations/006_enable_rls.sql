-- ============================================================
-- 006_enable_rls.sql
-- Enable Row Level Security on all tables.
-- All mutations go through createAdminClient() (service role),
-- which bypasses RLS. SELECT policies here protect the user-context
-- client (anon key) so non-members cannot read any project data.
-- ============================================================

-- -------------------------------------------------------
-- Enable RLS on every table
-- -------------------------------------------------------

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE places            ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_reviews     ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits    ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- Helper: is the calling user an accepted member?
-- SECURITY DEFINER so it can always read project_members.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   project_members
    WHERE  project_id   = p_project_id
      AND  user_id      = auth.uid()
      AND  invite_status = 'accepted'
  );
$$;

-- -------------------------------------------------------
-- profiles — any authenticated user can read (needed for
-- member name/avatar display in joined queries)
-- -------------------------------------------------------

CREATE POLICY "profiles: authenticated users can read"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- -------------------------------------------------------
-- projects — members only
-- -------------------------------------------------------

CREATE POLICY "projects: members can read"
  ON projects FOR SELECT
  USING (is_project_member(id));

-- -------------------------------------------------------
-- project_members — members of the same project can read
-- -------------------------------------------------------

CREATE POLICY "project_members: members can read"
  ON project_members FOR SELECT
  USING (is_project_member(project_id));

-- -------------------------------------------------------
-- project_invites — members of the same project can read
-- -------------------------------------------------------

CREATE POLICY "project_invites: members can read"
  ON project_invites FOR SELECT
  USING (is_project_member(project_id));

-- -------------------------------------------------------
-- categories / places / reviews / votes / comments
-- -------------------------------------------------------

CREATE POLICY "categories: members can read"
  ON categories FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "places: members can read"
  ON places FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "place_reviews: members can read"
  ON place_reviews FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "place_votes: members can read"
  ON place_votes FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "place_comments: members can read"
  ON place_comments FOR SELECT
  USING (is_project_member(project_id));

-- -------------------------------------------------------
-- expenses / splits
-- -------------------------------------------------------

CREATE POLICY "expenses: members can read"
  ON expenses FOR SELECT
  USING (is_project_member(project_id));

CREATE POLICY "expense_splits: members can read"
  ON expense_splits FOR SELECT
  USING (is_project_member(project_id));
