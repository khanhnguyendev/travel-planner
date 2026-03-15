# Architecture

## Technical Stack
- Next.js 16 with App Router using `src/app`
- TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Auth, Postgres, Storage, and Row Level Security
- Google Maps Places API for place resolution and reviews

## High-Level Design
The application uses Next.js for the frontend and route handlers, Supabase for authentication and persistent data, and Google Maps Places APIs for external place metadata. The product is structured for iterative AI-assisted development with a strong separation between product context, schema, permissions, and implementation phases.

## Frontend Structure
- `src/app`: route tree, layouts, route handlers
- `src/components`: reusable UI building blocks
- `src/features`: feature-level modules for places, votes, expenses, members
- `src/lib`: shared utilities, Supabase clients, validators, permissions, maps integration

## Backend Responsibilities
- Next.js route handlers validate requests and orchestrate application logic
- Supabase Auth manages sessions and identity
- Supabase Postgres stores project data
- Supabase Storage stores receipt images
- Invite issuance/acceptance flows create `project_invites` and `project_members` rows through server-side handlers
- RLS enforces access boundaries at the database layer

## Key Flows
### Project Flow
User signs in, creates a project, becomes owner, and invites members. Inviter specifies the intended role at send time; the role is stored on the invite and applied on acceptance.

### Place Flow
User pastes a Google Maps link. The app extracts place information, resolves metadata through Google APIs, and stores a normalized place record under a category. `place_reviews` and `expense_splits` carry a denormalized `project_id` to keep RLS policies simple and avoid joins.

### Voting Flow
Project members vote on places. Each vote is stored per member per place according to project rules. Votes are deleted via `DELETE /api/votes`; there is no null vote type.

### Expense Flow
A member creates an expense, selects split participants, uploads an optional receipt, and the app stores expense and split records in a single transaction.

### Receipt Upload Flow
1. Client calls `POST /api/uploads/receipt` to get a signed PUT URL.
2. Client uploads directly to Supabase Storage.
3. If `expenseId` was known, the path is final: `project/{id}/expenses/{expenseId}/{file}`.
4. If `expenseId` was not yet known, the path is temporary: `project/{id}/expenses/temp/{file}`.
5. On `POST /api/expenses`, the server moves the temp object to the final path and stores the canonical `receipt_path` on the expense row.
6. A scheduled cleanup job runs every 24 hours and deletes any objects under `.../expenses/temp/...` older than 24 hours to prevent orphan accumulation.

## Security Model
- All project data is scoped by membership
- Owner has strongest permissions
- Access to receipts is restricted through storage policies
- Sensitive database operations must be protected by RLS-aware queries and role checks
- Receipt objects live at `project/{project_id}/expenses/{expense_id}/{filename}` to align with Storage RLS

## Deployment Model
- Frontend and route handlers deployed on Vercel
- Supabase hosts database, auth, and storage
- Environment variables stored securely per environment
