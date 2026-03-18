-- ============================================================
-- 012_rename_project_to_trip.sql
-- Rename "project" → "trip" throughout the schema to match UI.
-- ============================================================

-- -------------------------------------------------------
-- 1. Rename tables
-- -------------------------------------------------------

ALTER TABLE projects        RENAME TO trips;
ALTER TABLE project_members RENAME TO trip_members;
ALTER TABLE project_invites RENAME TO trip_invites;
ALTER TABLE project_activity RENAME TO trip_activity;

-- -------------------------------------------------------
-- 2. Rename project_id → trip_id in every table
-- -------------------------------------------------------

ALTER TABLE trip_members    RENAME COLUMN project_id TO trip_id;
ALTER TABLE trip_invites    RENAME COLUMN project_id TO trip_id;
ALTER TABLE trip_activity   RENAME COLUMN project_id TO trip_id;
ALTER TABLE categories      RENAME COLUMN project_id TO trip_id;
ALTER TABLE places          RENAME COLUMN project_id TO trip_id;
ALTER TABLE place_reviews   RENAME COLUMN project_id TO trip_id;
ALTER TABLE place_votes     RENAME COLUMN project_id TO trip_id;
ALTER TABLE place_comments  RENAME COLUMN project_id TO trip_id;
ALTER TABLE expenses        RENAME COLUMN project_id TO trip_id;
ALTER TABLE expense_splits  RENAME COLUMN project_id TO trip_id;

-- -------------------------------------------------------
-- 3. Rename enum types
-- -------------------------------------------------------

ALTER TYPE project_role   RENAME TO trip_role;
ALTER TYPE project_status RENAME TO trip_status;

-- -------------------------------------------------------
-- 4. Rename key indexes
-- -------------------------------------------------------

ALTER INDEX IF EXISTS idx_projects_owner_user_id           RENAME TO idx_trips_owner_user_id;
ALTER INDEX IF EXISTS idx_project_members_project_id_role  RENAME TO idx_trip_members_trip_id_role;
ALTER INDEX IF EXISTS idx_project_members_user_id          RENAME TO idx_trip_members_user_id;
ALTER INDEX IF EXISTS uq_project_members_project_user      RENAME TO uq_trip_members_trip_user;
ALTER INDEX IF EXISTS idx_project_invites_project_id_status RENAME TO idx_trip_invites_trip_id_status;
ALTER INDEX IF EXISTS idx_project_invites_email_status     RENAME TO idx_trip_invites_email_status;
ALTER INDEX IF EXISTS uq_project_invites_pending           RENAME TO uq_trip_invites_pending;
ALTER INDEX IF EXISTS uq_project_invites_token             RENAME TO uq_trip_invites_token;
ALTER INDEX IF EXISTS project_activity_project_created_idx RENAME TO trip_activity_trip_created_idx;

-- -------------------------------------------------------
-- 5. Recreate helper function referencing new names
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS public.is_project_member(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   trip_members
    WHERE  trip_id       = p_trip_id
      AND  user_id       = auth.uid()
      AND  invite_status = 'accepted'
  );
$$;

-- -------------------------------------------------------
-- 6. Update internal trigger functions referencing old names
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION check_place_category_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM categories
    WHERE id = NEW.category_id
      AND trip_id = NEW.trip_id
  ) THEN
    RAISE EXCEPTION 'category_id % does not belong to trip_id %', NEW.category_id, NEW.trip_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_place_review_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM places
    WHERE id = NEW.place_id
      AND trip_id = NEW.trip_id
  ) THEN
    RAISE EXCEPTION 'place_reviews.trip_id % does not match places.trip_id for place %', NEW.trip_id, NEW.place_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION check_expense_split_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM expenses
    WHERE id = NEW.expense_id
      AND trip_id = NEW.trip_id
  ) THEN
    RAISE EXCEPTION 'expense_splits.trip_id % does not match expenses.trip_id for expense %', NEW.trip_id, NEW.expense_id;
  END IF;
  RETURN NEW;
END;
$$;

-- -------------------------------------------------------
-- 7. Drop old RLS policies and recreate with new names
-- -------------------------------------------------------

-- trips
DROP POLICY IF EXISTS "projects: public or members can read" ON trips;
CREATE POLICY "trips: public or members can read"
  ON trips FOR SELECT
  USING (visibility = 'public' OR is_trip_member(id));

-- trip_members
DROP POLICY IF EXISTS "project_members: members can read" ON trip_members;
CREATE POLICY "trip_members: members can read"
  ON trip_members FOR SELECT
  USING (is_trip_member(trip_id));

-- trip_invites
DROP POLICY IF EXISTS "project_invites: members can read" ON trip_invites;
CREATE POLICY "trip_invites: members can read"
  ON trip_invites FOR SELECT
  USING (is_trip_member(trip_id));

-- categories
DROP POLICY IF EXISTS "categories: public project or member" ON categories;
CREATE POLICY "categories: public trip or member"
  ON categories FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );

-- places
DROP POLICY IF EXISTS "places: public project or member" ON places;
CREATE POLICY "places: public trip or member"
  ON places FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );

-- place_reviews
DROP POLICY IF EXISTS "place_reviews: public project or member" ON place_reviews;
CREATE POLICY "place_reviews: public trip or member"
  ON place_reviews FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );

-- place_votes
DROP POLICY IF EXISTS "place_votes: public project or member" ON place_votes;
CREATE POLICY "place_votes: public trip or member"
  ON place_votes FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );

-- place_comments
DROP POLICY IF EXISTS "place_comments: public project or member" ON place_comments;
CREATE POLICY "place_comments: public trip or member"
  ON place_comments FOR SELECT
  USING (
    is_trip_member(trip_id)
    OR EXISTS (SELECT 1 FROM trips WHERE id = trip_id AND visibility = 'public')
  );

-- expenses
DROP POLICY IF EXISTS "expenses: members can read" ON expenses;
CREATE POLICY "expenses: members can read"
  ON expenses FOR SELECT
  USING (is_trip_member(trip_id));

-- expense_splits
DROP POLICY IF EXISTS "expense_splits: members can read" ON expense_splits;
CREATE POLICY "expense_splits: members can read"
  ON expense_splits FOR SELECT
  USING (is_trip_member(trip_id));

-- trip_activity
DROP POLICY IF EXISTS "activity: members can read" ON trip_activity;
CREATE POLICY "trip_activity: members can read"
  ON trip_activity FOR SELECT
  USING (is_trip_member(trip_id));
