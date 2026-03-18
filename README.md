# Travel Planner

A collaborative trip planning app for groups. Collect places, vote on destinations, and track shared expenses — all in one workspace.

---

## Features

- **Trip management** — create trips with dates, cover photos, visibility (public/private), and optional budget
- **Place search** — search via Mapbox and add places to a trip with categories, visit dates, and notes
- **Voting** — upvote, downvote, or score places; Top Picks leaderboard surfaces the group's favorites
- **Timeline & map views** — see the itinerary in chronological order or on an interactive map
- **Expense tracking** — log shared expenses with multi-currency support, receipt uploads, and categories
- **Debt splitting** — automatic net-balance calculation and minimum-transaction settlement
- **Roles & invites** — owner / admin / editor / viewer roles; invite members by email link
- **Activity feed** — per-trip log of every member action (place added, vote cast, comment, expense, etc.)
- **Accommodation** — dedicated category type for hotels/stays, surfaced separately above the main place list

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, TypeScript) |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (OAuth + email/password) |
| Styling | Tailwind CSS 4 + Lucide icons |
| Maps | Mapbox SearchBox API (place search & autocomplete) |
| Map display | Leaflet |
| Validation | Zod |
| Package manager | pnpm |

---

## Project structure

```
src/
├── app/
│   ├── (app)/               # Protected routes (auth required)
│   │   ├── dashboard/       # Trip list
│   │   ├── trips/
│   │   │   ├── new/         # Create trip
│   │   │   └── [tripId]/    # Trip detail, members, expenses
│   │   └── invites/accept/
│   ├── (auth)/              # Sign-in, sign-up
│   ├── api/                 # API routes (places, votes, expenses, uploads, invites)
│   └── auth/callback/       # OAuth callback
├── components/              # UI components (places, expenses, members, votes, …)
├── features/                # Server queries & actions per domain
│   ├── trips/
│   ├── places/
│   ├── votes/
│   ├── expenses/
│   ├── members/
│   ├── categories/
│   └── activity/
└── lib/                     # Supabase clients, types, utils, logger
supabase/
└── migrations/              # SQL migrations (001 → 012)
```

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm (`npm i -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB or pushing migrations)
- A [Supabase](https://supabase.com) project
- A [Mapbox](https://mapbox.com) account (for the SearchBox API token)

### 1. Clone and install

```bash
git clone <repo-url>
cd travel-planner
pnpm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# Mapbox (server-only — never expose to the client)
MAPBOX_SECRET_TOKEN=sk.eyJ...

# App URL (used for OAuth redirects and invite links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Apply database migrations

```bash
supabase db push
```

This applies all 12 migrations in `supabase/migrations/` to your remote Supabase project.

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database schema

Core tables (all with Row-Level Security enabled):

| Table | Description |
|---|---|
| `profiles` | User profiles, linked to `auth.users` |
| `trips` | Trips with title, dates, budget, visibility |
| `trip_members` | Membership with role and invite status |
| `trip_invites` | Email-based invite tokens |
| `categories` | Place categories per trip |
| `places` | Places with coordinates, schedule, and metadata |
| `place_votes` | Upvote / downvote / score per user per place |
| `place_comments` | Comments on places |
| `place_reviews` | Imported reviews (Mapbox, etc.) |
| `expenses` | Shared expenses with currency and category |
| `expense_splits` | Per-member split amounts and settlement status |
| `trip_activity` | Activity log for the feed |

Roles: `owner` › `admin` › `editor` › `viewer`

All mutations go through a service-role admin client (`createAdminClient()`), which bypasses RLS. The user-context client is read-only and protected by RLS policies.

---

## Scripts

```bash
pnpm dev        # Development server (http://localhost:3000)
pnpm build      # Production build
pnpm start      # Start production server
pnpm lint       # ESLint
```

---

## Deployment

The app is Vercel-ready (no extra config needed). For any Node.js host:

```bash
pnpm build
pnpm start
```

**Before deploying:**

1. Set all environment variables in your hosting dashboard.
2. Update `NEXT_PUBLIC_SITE_URL` to your production domain.
3. Add your production domain to `serverActions.allowedOrigins` in `next.config.mjs`.
4. In Supabase → Authentication → URL Configuration, add your production URL to the allowed redirect list.
5. Place a `1200×630` Open Graph image at `public/og-image.png` for social previews.

---

## Contributing

1. Branch off `main`
2. Make changes and run `pnpm lint && pnpm build` to verify
3. Open a pull request

---

## License

MIT
