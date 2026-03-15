# Database Schema

This document captures the relational model, recommended constraints, and supporting indexes for the MVP scope.

## Enums
- `project_role`: `owner`, `admin`, `editor`, `viewer`
- `project_status`: `active`, `archived`
- `invite_status`: `pending`, `accepted`, `revoked`, `expired`
- `visibility`: `private`, `shared` (shared still requires invite; no public browsing in MVP)
- `vote_type`: `upvote`, `downvote`, `score`
- `split_status`: `pending`, `settled`

## Main Tables

### profiles
Stores user profile information mapped to authenticated users.
Fields: `id (uuid, pk)`, `display_name`, `avatar_url`, `created_at timestamptz default now()`.

### projects
Stores travel projects.
Fields: `id (uuid, pk)`, `owner_user_id (uuid fk profiles)`, `title text NOT NULL CHECK (title <> '')`, `description`, `cover_image_url`, `visibility enum`, `status enum default 'active'`, `start_date date`, `end_date date`, `created_at`, `updated_at`.
Constraints: `owner_user_id` required; `status` controls archive/read-only behavior.

### project_members
Membership and role assignments.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `user_id (fk profiles)`, `role enum`, `invite_status enum`, `joined_at`, `created_at`.
Constraints: unique `(project_id, user_id)`; `invite_status='accepted'` required before elevated actions.

### project_invites
Tracks invite lifecycle.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `email`, `invited_by_user_id (fk profiles)`, `token`, `role project_role default 'editor'`, `status enum`, `expires_at timestamptz CHECK (expires_at > created_at)`, `created_at`.
Constraints: unique `(project_id, email, status in ('pending'))`; token unique.
Note: `role` carries the intended membership role granted on acceptance. Defaults to `editor`.

### categories
Custom project categories.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `name`, `color`, `icon`, `sort_order int`, `created_at`.
Constraints: unique `(project_id, lower(name))` to avoid duplicates; `sort_order` optional.

### places
Resolved place records.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `category_id (fk categories)`, `created_by_user_id (fk profiles)`, `source_url`, `source_provider`, `external_place_id`, `name`, `address`, `lat`, `lng`, `rating`, `price_level`, `editorial_summary`, `metadata_json jsonb`, `created_at`.
Constraints: `category_id` must belong to same `project_id` (enforced at application layer and via trigger); unique `(project_id, external_place_id)` to prevent duplicates.

### place_reviews
Selected external reviews or normalized snapshots.
Fields: `id (uuid, pk)`, `place_id (fk places)`, `project_id (fk projects)`, `author_name`, `rating`, `text`, `published_at`, `source_provider`, `raw_json jsonb`, `created_at`.
Constraints: `place_id` required; `project_id` denormalized from the parent place for efficient RLS and queries. Must equal `places.project_id`.
Note: `project_id` is denormalized here to make RLS policies implementable without joins.

### place_votes
Member votes for places.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `place_id (fk places)`, `user_id (fk profiles)`, `vote_type enum`, `score int CHECK (score IS NULL OR score BETWEEN 1 AND 10)`, `created_at`, `updated_at`.
Constraints: unique `(place_id, user_id)`; `project_id` must match the place's project (enforced at application layer); `score` must be non-null when `vote_type = 'score'`, null otherwise (enforced via CHECK or trigger).

### expenses
Shared expenses.
Fields: `id (uuid, pk)`, `project_id (fk projects)`, `paid_by_user_id (fk profiles)`, `title`, `amount numeric(12,2) CHECK (amount > 0)`, `currency`, `expense_date timestamptz`, `note`, `receipt_path`, `created_at`, `updated_at`.
Constraints: `receipt_path` should embed `project_id` per storage policy; `expense_date` records when the expense occurred (distinct from `created_at`).

### expense_splits
Per-user share allocations.
Fields: `id (uuid, pk)`, `expense_id (fk expenses)`, `project_id (fk projects)`, `user_id (fk profiles)`, `amount_owed numeric(12,2) CHECK (amount_owed >= 0)`, `status enum`, `created_at`.
Constraints: unique `(expense_id, user_id)`; splits total must equal parent `expense.amount` (enforced at application layer); all `user_id` must be accepted members of `project_id`.
Note: `project_id` is denormalized here to make RLS policies implementable without joins.

## CHECK Constraints Summary

| Table | Column | Constraint |
|---|---|---|
| `projects` | `title` | `title <> ''` |
| `project_invites` | `expires_at` | `expires_at > created_at` |
| `place_votes` | `score` | `score IS NULL OR score BETWEEN 1 AND 10` |
| `place_votes` | `score` / `vote_type` | `score IS NOT NULL` when `vote_type = 'score'`, else `score IS NULL` (trigger or generated check) |
| `expenses` | `amount` | `amount > 0` |
| `expense_splits` | `amount_owed` | `amount_owed >= 0` |

## Indexes

- FK indexes on all foreign keys.
- Composite indexes:
  - `project_members(project_id, role)`
  - `places(project_id, category_id)`
  - `place_votes(place_id)` and `place_votes(user_id)`
  - `expenses(project_id, created_at desc)`
  - `expense_splits(expense_id)`
  - `expense_splits(user_id)` — for "what do I owe" queries across a project
  - `project_invites(project_id, status)` — for listing active invites per project
  - `project_invites(email, status)` — for lookup during accept flow
  - `place_reviews(place_id)` — for fetching reviews by place
  - `projects(owner_user_id)` — for dashboard "my projects" queries
- Uniqueness:
  - `project_members(project_id, user_id)`
  - `project_invites(token)` and `project_invites(project_id, email, status='pending')`
  - `categories(project_id, lower(name))`
  - `places(project_id, external_place_id)`
  - `place_votes(place_id, user_id)`
  - `expense_splits(expense_id, user_id)`

## Cross-Table Consistency Notes

Two constraints cannot be enforced with standard FK alone and require triggers or application-layer checks:
- `places.category_id` must belong to the same `project_id` as the place.
- `place_votes.project_id` must match `places.project_id` for the referenced place.

Both should be validated in route handlers before any insert/update, and optionally enforced with a `BEFORE INSERT OR UPDATE` trigger.
