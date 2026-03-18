-- 009_visibility_public.sql
-- Rename 'shared' visibility to 'public'.
-- ALTER TYPE ... RENAME VALUE renames the label in-place (no row update needed).
-- Also update RLS so any authenticated user can read public projects
-- and their related data.

ALTER TYPE visibility RENAME VALUE 'shared' TO 'public';

-- Drop old policy and recreate with public support
DROP POLICY IF EXISTS "projects: members can read" ON projects;

CREATE POLICY "projects: public or members can read"
  ON projects FOR SELECT
  USING (visibility = 'public' OR is_project_member(id));

-- Allow any authenticated user to read categories/places/etc of public projects
DROP POLICY IF EXISTS "categories: members can read" ON categories;
CREATE POLICY "categories: public project or member"
  ON categories FOR SELECT
  USING (
    is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility = 'public')
  );

DROP POLICY IF EXISTS "places: members can read" ON places;
CREATE POLICY "places: public project or member"
  ON places FOR SELECT
  USING (
    is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility = 'public')
  );

DROP POLICY IF EXISTS "place_reviews: members can read" ON place_reviews;
CREATE POLICY "place_reviews: public project or member"
  ON place_reviews FOR SELECT
  USING (
    is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility = 'public')
  );

DROP POLICY IF EXISTS "place_votes: members can read" ON place_votes;
CREATE POLICY "place_votes: public project or member"
  ON place_votes FOR SELECT
  USING (
    is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility = 'public')
  );

DROP POLICY IF EXISTS "place_comments: members can read" ON place_comments;
CREATE POLICY "place_comments: public project or member"
  ON place_comments FOR SELECT
  USING (
    is_project_member(project_id)
    OR EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility = 'public')
  );

DROP POLICY IF EXISTS "expenses: members can read" ON expenses;
CREATE POLICY "expenses: members can read"
  ON expenses FOR SELECT
  USING (is_project_member(project_id));

DROP POLICY IF EXISTS "expense_splits: members can read" ON expense_splits;
CREATE POLICY "expense_splits: members can read"
  ON expense_splits FOR SELECT
  USING (is_project_member(project_id));
