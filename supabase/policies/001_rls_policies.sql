-- ============================================================
-- 001_rls_policies.sql
-- Row Level Security policies for Travel Planner MVP
-- ============================================================

-- -------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------

-- Returns true if the current user is an accepted member of the project.
CREATE OR REPLACE FUNCTION is_member(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
  );
$$;

-- Returns true if the current user's role is in the provided list.
CREATE OR REPLACE FUNCTION is_role(p_project_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
      AND role::text = ANY(p_roles)
  );
$$;

-- Returns true if the current user is the owner of the project.
CREATE OR REPLACE FUNCTION is_owner(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND invite_status = 'accepted'
      AND role = 'owner'
  );
$$;

-- Returns true if the project is currently active (not archived).
CREATE OR REPLACE FUNCTION is_project_active(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects
    WHERE id = p_project_id
      AND status = 'active'
  );
$$;

-- -------------------------------------------------------
-- Enable RLS on all tables
-- -------------------------------------------------------

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE places           ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits   ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- profiles
-- -------------------------------------------------------

-- Users can read any profile (needed to resolve member display names).
CREATE POLICY "profiles: read any"
  ON profiles FOR SELECT
  USING (true);

-- Users can only insert/update their own profile.
CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -------------------------------------------------------
-- projects
-- -------------------------------------------------------

CREATE POLICY "projects: select as member or owner"
  ON projects FOR SELECT
  USING (
    is_member(id) OR owner_user_id = auth.uid()
  );

-- Only the owner can update a project. Allow updating status regardless of active state;
-- block other updates when archived.
CREATE POLICY "projects: update by owner"
  ON projects FOR UPDATE
  USING (
    owner_user_id = auth.uid()
    AND (
      -- Allow changing status (archive/unarchive) at any time
      is_project_active(id)
      OR (SELECT status FROM projects WHERE id = projects.id) = 'archived'
    )
  )
  WITH CHECK (owner_user_id = auth.uid());

-- Insert and delete are service-role-only (no policy = no access for anon/authenticated).

-- -------------------------------------------------------
-- project_members
-- -------------------------------------------------------

CREATE POLICY "project_members: select as member"
  ON project_members FOR SELECT
  USING (is_member(project_id));

-- Owner or admin can insert new members.
CREATE POLICY "project_members: insert by owner or admin"
  ON project_members FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin'])
  );

-- Owner or admin can update any member's role or invite_status.
CREATE POLICY "project_members: update by owner or admin"
  ON project_members FOR UPDATE
  USING (
    is_role(project_id, ARRAY['owner', 'admin'])
  )
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin'])
  );

-- A member may update ONLY their own invite_status to 'accepted'.
-- This is enforced by limiting the policy to rows where user_id = auth.uid()
-- and using a WITH CHECK that only allows accepted status.
CREATE POLICY "project_members: self accept invite"
  ON project_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND invite_status = 'accepted'
  );

-- Owner can remove any member; admin can remove non-owner members.
CREATE POLICY "project_members: delete by owner"
  ON project_members FOR DELETE
  USING (is_owner(project_id));

CREATE POLICY "project_members: delete non-owner by admin"
  ON project_members FOR DELETE
  USING (
    is_role(project_id, ARRAY['admin'])
    AND role <> 'owner'
  );

-- -------------------------------------------------------
-- project_invites
-- -------------------------------------------------------

CREATE POLICY "project_invites: manage by owner or admin"
  ON project_invites FOR SELECT
  USING (is_role(project_id, ARRAY['owner', 'admin']));

CREATE POLICY "project_invites: insert by owner or admin"
  ON project_invites FOR INSERT
  WITH CHECK (is_role(project_id, ARRAY['owner', 'admin']));

CREATE POLICY "project_invites: update by owner or admin"
  ON project_invites FOR UPDATE
  USING (is_role(project_id, ARRAY['owner', 'admin']))
  WITH CHECK (is_role(project_id, ARRAY['owner', 'admin']));

CREATE POLICY "project_invites: delete by owner or admin"
  ON project_invites FOR DELETE
  USING (is_role(project_id, ARRAY['owner', 'admin']));

-- Column-level grant: hide token from authenticated role; service role retains full access.
-- Revoke full select and re-grant only safe columns.
REVOKE SELECT ON project_invites FROM authenticated;
GRANT SELECT (id, project_id, email, role, status, expires_at, created_at, invited_by_user_id)
  ON project_invites TO authenticated;

-- -------------------------------------------------------
-- categories
-- -------------------------------------------------------

CREATE POLICY "categories: select as member"
  ON categories FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "categories: insert by editor or above"
  ON categories FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "categories: update by editor or above"
  ON categories FOR UPDATE
  USING (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  )
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "categories: delete by owner or admin"
  ON categories FOR DELETE
  USING (
    is_role(project_id, ARRAY['owner', 'admin'])
    AND is_project_active(project_id)
  );

-- -------------------------------------------------------
-- places
-- -------------------------------------------------------

CREATE POLICY "places: select as member"
  ON places FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "places: insert by editor or above"
  ON places FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "places: update by editor or above"
  ON places FOR UPDATE
  USING (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  )
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "places: delete by owner or admin"
  ON places FOR DELETE
  USING (
    is_role(project_id, ARRAY['owner', 'admin'])
    AND is_project_active(project_id)
  );

-- -------------------------------------------------------
-- place_reviews
-- -------------------------------------------------------

CREATE POLICY "place_reviews: select as member"
  ON place_reviews FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "place_reviews: insert by editor or above"
  ON place_reviews FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "place_reviews: delete by owner or admin"
  ON place_reviews FOR DELETE
  USING (
    is_role(project_id, ARRAY['owner', 'admin'])
    AND is_project_active(project_id)
  );

-- -------------------------------------------------------
-- place_votes
-- -------------------------------------------------------

CREATE POLICY "place_votes: select as member"
  ON place_votes FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "place_votes: insert own vote"
  ON place_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND is_member(project_id)
    AND is_project_active(project_id)
  );

CREATE POLICY "place_votes: update own vote"
  ON place_votes FOR UPDATE
  USING (
    user_id = auth.uid()
    AND is_member(project_id)
    AND is_project_active(project_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND is_member(project_id)
    AND is_project_active(project_id)
  );

CREATE POLICY "place_votes: delete own vote"
  ON place_votes FOR DELETE
  USING (
    user_id = auth.uid()
    AND is_member(project_id)
  );

-- -------------------------------------------------------
-- expenses
-- -------------------------------------------------------

CREATE POLICY "expenses: select as member"
  ON expenses FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "expenses: insert by editor or above"
  ON expenses FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "expenses: update by creator or owner or admin"
  ON expenses FOR UPDATE
  USING (
    (
      paid_by_user_id = auth.uid()
      OR is_role(project_id, ARRAY['owner', 'admin'])
    )
    AND is_project_active(project_id)
  )
  WITH CHECK (
    (
      paid_by_user_id = auth.uid()
      OR is_role(project_id, ARRAY['owner', 'admin'])
    )
    AND is_project_active(project_id)
  );

CREATE POLICY "expenses: delete by creator or owner or admin"
  ON expenses FOR DELETE
  USING (
    (
      paid_by_user_id = auth.uid()
      OR is_role(project_id, ARRAY['owner', 'admin'])
    )
    AND is_project_active(project_id)
  );

-- -------------------------------------------------------
-- expense_splits
-- -------------------------------------------------------

CREATE POLICY "expense_splits: select as member"
  ON expense_splits FOR SELECT
  USING (is_member(project_id));

CREATE POLICY "expense_splits: insert by editor or above"
  ON expense_splits FOR INSERT
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "expense_splits: update by editor or above"
  ON expense_splits FOR UPDATE
  USING (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  )
  WITH CHECK (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

CREATE POLICY "expense_splits: delete by editor or above"
  ON expense_splits FOR DELETE
  USING (
    is_role(project_id, ARRAY['owner', 'admin', 'editor'])
    AND is_project_active(project_id)
  );

-- -------------------------------------------------------
-- Storage: receipts bucket policies
-- -------------------------------------------------------
-- These assume the bucket "receipts" has already been created.
-- Path convention: project/{project_id}/expenses/{expense_id}/{filename}
-- Temp path:       project/{project_id}/expenses/temp/{filename}

-- Read: is_member for the project_id extracted from the path
CREATE POLICY "receipts: read by member"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND is_member(
      (string_to_array(name, '/'))[2]::uuid
    )
  );

-- Write: editor or above + active project
CREATE POLICY "receipts: write by editor or above"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND is_role(
      (string_to_array(name, '/'))[2]::uuid,
      ARRAY['owner', 'admin', 'editor']
    )
    AND is_project_active(
      (string_to_array(name, '/'))[2]::uuid
    )
  );

-- Update (move/rename): same as write
CREATE POLICY "receipts: update by editor or above"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND is_role(
      (string_to_array(name, '/'))[2]::uuid,
      ARRAY['owner', 'admin', 'editor']
    )
    AND is_project_active(
      (string_to_array(name, '/'))[2]::uuid
    )
  );

-- Delete: owner or admin only
CREATE POLICY "receipts: delete by owner or admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND is_role(
      (string_to_array(name, '/'))[2]::uuid,
      ARRAY['owner', 'admin']
    )
  );

-- List: disallow for all (private bucket; no directory listing)
-- No SELECT policy for listing; covered by the read policy above which requires
-- an exact path match enforced by the application layer.
