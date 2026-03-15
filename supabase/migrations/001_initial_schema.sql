-- ============================================================
-- 001_initial_schema.sql
-- Full initial schema for Travel Planner MVP
-- ============================================================

-- -------------------------------------------------------
-- Enums
-- -------------------------------------------------------

CREATE TYPE project_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE project_status AS ENUM ('active', 'archived');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');
CREATE TYPE visibility AS ENUM ('private', 'shared');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote', 'score');
CREATE TYPE split_status AS ENUM ('pending', 'settled');

-- -------------------------------------------------------
-- profiles
-- -------------------------------------------------------

CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- projects
-- -------------------------------------------------------

CREATE TABLE projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title            text NOT NULL CHECK (title <> ''),
  description      text,
  cover_image_url  text,
  visibility       visibility NOT NULL DEFAULT 'private',
  status           project_status NOT NULL DEFAULT 'active',
  start_date       date,
  end_date         date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_owner_user_id ON projects(owner_user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- project_members
-- -------------------------------------------------------

CREATE TABLE project_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role           project_role NOT NULL DEFAULT 'editor',
  invite_status  invite_status NOT NULL DEFAULT 'pending',
  joined_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_project_members_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project_id_role ON project_members(project_id, role);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- -------------------------------------------------------
-- project_invites
-- -------------------------------------------------------

CREATE TABLE project_invites (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email                text NOT NULL,
  invited_by_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  token                text NOT NULL,
  role                 project_role NOT NULL DEFAULT 'editor',
  status               invite_status NOT NULL DEFAULT 'pending',
  expires_at           timestamptz NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_invite_expires_after_created CHECK (expires_at > created_at),
  CONSTRAINT uq_project_invites_token UNIQUE (token)
);

-- Partial unique index: only one pending invite per (project, email)
CREATE UNIQUE INDEX uq_project_invites_pending
  ON project_invites(project_id, email)
  WHERE status = 'pending';

CREATE INDEX idx_project_invites_project_id_status ON project_invites(project_id, status);
CREATE INDEX idx_project_invites_email_status ON project_invites(email, status);

-- -------------------------------------------------------
-- categories
-- -------------------------------------------------------

CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text,
  icon        text,
  sort_order  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive unique name per project
CREATE UNIQUE INDEX uq_categories_project_name
  ON categories(project_id, lower(name));

CREATE INDEX idx_categories_project_id ON categories(project_id);

-- -------------------------------------------------------
-- places
-- -------------------------------------------------------

CREATE TABLE places (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  created_by_user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source_url            text,
  source_provider       text,
  external_place_id     text,
  name                  text NOT NULL,
  address               text,
  lat                   numeric(10, 7),
  lng                   numeric(10, 7),
  rating                numeric(3, 1),
  price_level           int,
  editorial_summary     text,
  metadata_json         jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_places_project_external UNIQUE (project_id, external_place_id)
);

CREATE INDEX idx_places_project_id_category_id ON places(project_id, category_id);
CREATE INDEX idx_places_project_id ON places(project_id);
CREATE INDEX idx_places_category_id ON places(category_id);

-- Trigger: category_id must belong to the same project_id as the place
CREATE OR REPLACE FUNCTION check_place_category_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM categories
    WHERE id = NEW.category_id
      AND project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'category_id % does not belong to project_id %', NEW.category_id, NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_places_category_project
  BEFORE INSERT OR UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION check_place_category_project();

-- -------------------------------------------------------
-- place_reviews
-- -------------------------------------------------------

CREATE TABLE place_reviews (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id         uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_name      text,
  rating           numeric(3, 1),
  text             text,
  published_at     timestamptz,
  source_provider  text,
  raw_json         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_place_reviews_place_id ON place_reviews(place_id);
CREATE INDEX idx_place_reviews_project_id ON place_reviews(project_id);

-- Trigger: place_reviews.project_id must equal places.project_id
CREATE OR REPLACE FUNCTION check_place_review_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM places
    WHERE id = NEW.place_id
      AND project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'place_reviews.project_id % does not match places.project_id for place %', NEW.project_id, NEW.place_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_place_reviews_project_consistency
  BEFORE INSERT OR UPDATE ON place_reviews
  FOR EACH ROW EXECUTE FUNCTION check_place_review_project();

-- -------------------------------------------------------
-- place_votes
-- -------------------------------------------------------

CREATE TABLE place_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  place_id    uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote_type   vote_type NOT NULL,
  score       int CHECK (score IS NULL OR (score BETWEEN 1 AND 10)),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_place_votes_place_user UNIQUE (place_id, user_id)
);

CREATE INDEX idx_place_votes_place_id ON place_votes(place_id);
CREATE INDEX idx_place_votes_user_id ON place_votes(user_id);
CREATE INDEX idx_place_votes_project_id ON place_votes(project_id);

CREATE TRIGGER trg_place_votes_updated_at
  BEFORE UPDATE ON place_votes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger: score must be non-null when vote_type = 'score', null otherwise
CREATE OR REPLACE FUNCTION check_vote_score_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.vote_type = 'score' AND NEW.score IS NULL THEN
    RAISE EXCEPTION 'score must not be null when vote_type = ''score''';
  END IF;
  IF NEW.vote_type <> 'score' AND NEW.score IS NOT NULL THEN
    RAISE EXCEPTION 'score must be null when vote_type != ''score''';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_place_votes_score_consistency
  BEFORE INSERT OR UPDATE ON place_votes
  FOR EACH ROW EXECUTE FUNCTION check_vote_score_consistency();

-- -------------------------------------------------------
-- expenses
-- -------------------------------------------------------

CREATE TABLE expenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  paid_by_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  title             text NOT NULL,
  amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
  currency          text NOT NULL DEFAULT 'USD',
  expense_date      timestamptz,
  note              text,
  receipt_path      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_project_id_created_at ON expenses(project_id, created_at DESC);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_paid_by_user_id ON expenses(paid_by_user_id);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------
-- expense_splits
-- -------------------------------------------------------

CREATE TABLE expense_splits (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id   uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  amount_owed  numeric(12, 2) NOT NULL CHECK (amount_owed >= 0),
  status       split_status NOT NULL DEFAULT 'pending',
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_expense_splits_expense_user UNIQUE (expense_id, user_id)
);

CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX idx_expense_splits_project_id ON expense_splits(project_id);

-- Trigger: expense_splits.project_id must equal expenses.project_id
CREATE OR REPLACE FUNCTION check_expense_split_project()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM expenses
    WHERE id = NEW.expense_id
      AND project_id = NEW.project_id
  ) THEN
    RAISE EXCEPTION 'expense_splits.project_id % does not match expenses.project_id for expense %', NEW.project_id, NEW.expense_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_splits_project_consistency
  BEFORE INSERT OR UPDATE ON expense_splits
  FOR EACH ROW EXECUTE FUNCTION check_expense_split_project();
