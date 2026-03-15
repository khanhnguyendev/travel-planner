# RLS Policies

Concrete policy intent for Supabase Postgres and Storage. Every policy should ensure the row (or object path) is bound to a project where the requester is a member, and then apply role-based capabilities.

## Common Helpers

- `is_member(project_id)` → exists accepted row in `project_members` for `auth.uid()`.
- `is_role(project_id, roles text[])` → membership role in list.
- `is_owner(project_id)` → role = owner.
- `is_project_active(project_id)` → `projects.status = 'active'` for the given project. Must be checked on all mutation policies to block writes on archived projects. Owner is exempt from this check for status-change operations only.
- Archived projects (`projects.status = 'archived'`) are readable but block all mutations except owner changing `status`.

## Tables

### projects

- Select: allowed if `is_member(projects.id)` or `projects.owner_user_id = auth.uid()`.
- Update: owner only; must include `is_project_active` check except when updating `status` itself.
- Insert/Delete: service roles only (managed by backend).

### project_members

- Select: `is_member(project_id)`; members can see the roster.
- Insert: service/backend when accepting invite; owner/admin can add members.
- Update (owner/admin): can change `role` or `invite_status` for any member.
- Update (self): a member may update only their own `invite_status` column to `accepted`. The `WITH CHECK` clause must restrict writable columns to `invite_status` only — members must not be able to update their own `role`.
- Delete: owner can remove any; admin can remove non-owner members.

### project_invites

- Select/Insert/Update/Delete: owner or admin of the project only.
- The `token` column is sensitive. Do not expose it through Select to non-service callers. Route handlers must explicitly exclude `token` from all responses except the initial create response. Consider applying column-level security (`GRANT SELECT (id, project_id, email, role, status, expires_at, created_at)`) rather than granting the full row.

### categories

- Select: `is_member(project_id)`.
- Insert/Update: `is_role(project_id, ARRAY['owner','admin','editor'])` AND `is_project_active(project_id)`.
- Delete: owner/admin AND `is_project_active(project_id)`.

### places

- Select: `is_member(project_id)`.
- Insert/Update: `is_role(project_id, ARRAY['owner','admin','editor'])` AND `is_project_active(project_id)`. Category must belong to same project (validated in route handler before insert).
- Delete: owner/admin AND `is_project_active(project_id)`.

### place_reviews

- Select: `is_member(project_id)` — uses the denormalized `project_id` column directly; no join needed.
- Insert: service role or same creator role set as places (`is_role(project_id, ARRAY['owner','admin','editor'])`), only alongside place creation/update. `project_id` must equal the parent place's `project_id`.
- Delete: owner/admin.

### place_votes

- Select: `is_member(project_id)`.
- Insert/Update: `user_id = auth.uid()` AND `is_member(project_id)` AND `is_project_active(project_id)`; enforce one row per `(place_id, user_id)` via unique constraint.
- Delete: `user_id = auth.uid()` AND `is_member(project_id)`.

### expenses

- Select: `is_member(project_id)`.
- Insert: `is_role(project_id, ARRAY['owner','admin','editor'])` AND `is_project_active(project_id)`. `paid_by_user_id` must be an accepted member of the project (validated in route handler).
- Update/Delete: (creator OR owner OR admin) AND `is_project_active(project_id)`.

### expense_splits

- Select: `is_member(project_id)` — uses the denormalized `project_id` column directly; no join needed.
- Insert/Update/Delete: follow expense permissions; `user_id` must be an accepted member of `project_id` (validated in route handler).

## Storage: receipts bucket

- Path convention: `project/{project_id}/expenses/{expense_id}/{filename}`.
- Read: allowed if `is_member(project_id)` derived from path.
- Write: `is_role(project_id, ['owner','admin','editor'])` AND `is_project_active(project_id)`; writer should be the expense creator for tighter control.
- List: disallow (private bucket).
- Temp paths: `project/{project_id}/expenses/temp/{filename}` are used before an expense ID is known. These must be cleaned up within 24 hours by a scheduled job or on expense creation (move/rename to final path). Stale temp objects older than 24h should be deleted.

## Additional Guardrails

- Apply `is_project_active(project_id)` to **all mutation policies** for categories, places, place_reviews, place_votes, expenses, and expense_splits. Never rely on individual tables implementing this inconsistently — use the shared helper everywhere.
- Use deferrable FK constraints to guarantee cross-table project consistency (e.g., place category must belong to same project).
- `paid_by_user_id` in expenses may be set to any accepted project member (not only `auth.uid()`), allowing recording on behalf of others. Route handlers must verify the value is an accepted member of the project before insert.
- Viewer role members can vote by default. If per-project viewer voting restriction is needed in a future phase, a `project_settings` table with a `viewers_can_vote boolean` flag should be added and checked in the `place_votes` Insert policy.
