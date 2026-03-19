import Link from 'next/link';
import {
  Plus,
  Compass,
  Users,
  Globe,
  Lock,
  Crown,
  Pencil,
  Eye,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
  Sparkles,
  Clock3,
} from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { getPublicTrips, getTrips, type TripWithRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { formatDateRange, getTripDurationLabel } from '@/lib/date';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Trip } from '@/lib/types';
import { normalizePublicStorageUrl } from '@/lib/storage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Trang chu' };

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  owner: { icon: <Crown className="h-3 w-3" />, label: 'Owner', color: '#B45309', bg: '#FEF3C7' },
  admin: { icon: <ShieldCheck className="h-3 w-3" />, label: 'Admin', color: '#6D28D9', bg: '#EDE9FE' },
  editor: { icon: <Pencil className="h-3 w-3" />, label: 'Editor', color: '#065F46', bg: '#D1FAE5' },
  viewer: { icon: <Eye className="h-3 w-3" />, label: 'Viewer', color: '#374151', bg: '#F3F4F6' },
};

const VISIBILITY_CONFIG = {
  public: { icon: <Globe className="h-3 w-3" />, label: 'Public', color: '#1D4ED8', bg: '#DBEAFE' },
  private: { icon: <Lock className="h-3 w-3" />, label: 'Private', color: '#475569', bg: '#E2E8F0' },
} as const;

async function TripCard({ trip }: { trip: TripWithRole }) {
  const members = await getMembers(trip.id);
  const hasCover = !!trip.cover_image_url;
  const role = ROLE_CONFIG[trip.myRole] ?? ROLE_CONFIG.viewer;
  const isArchived = trip.status === 'archived';
  const isPublic = trip.visibility === 'public';
  const visibility = isPublic ? VISIBILITY_CONFIG.public : VISIBILITY_CONFIG.private;
  const updatedLabel = formatDateTime(trip.updated_at, { includeYear: false });
  const coverUrl = normalizePublicStorageUrl(trip.cover_image_url);
  const durationLabel = getTripDurationLabel(trip.start_date, trip.end_date);

  return (
    <Link href={`/trips/${trip.id}`} className="group block overflow-hidden rounded-[1.75rem] section-shell animate-in slide-up">
      <div className="relative h-48 overflow-hidden rounded-t-[1.75rem]">
        {hasCover && coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="hero-orb h-full w-full">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute left-6 top-10 h-16 w-16 rounded-full bg-white/12" />
            <div className="absolute bottom-0 right-5 h-24 w-24 rounded-full bg-white/10" />
          </div>
        )}

        <div className="trip-hero-overlay absolute inset-0" />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            <Clock3 className="h-3 w-3" />
            Updated {updatedLabel}
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
              style={{ backgroundColor: role.bg, color: role.color }}
            >
              {role.icon}
              {role.label}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
              style={{ backgroundColor: visibility.bg, color: visibility.color }}
            >
              {visibility.icon}
              {visibility.label}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          {isArchived && (
            <span className="mb-2 inline-flex items-center rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              Archived
            </span>
          )}
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-white section-title">
            {trip.title}
          </h3>
          {trip.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/74">
              {trip.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" />
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="mini-stat px-3 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            Schedule
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>
            {trip.start_date && trip.end_date
              ? `${formatDateRange(trip.start_date, trip.end_date).replace(/\s*\([^)]*\)\s*$/, '')}`
              : 'Dates flexible'}
          </p>
          {durationLabel && (
            <p className="mt-1 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              {durationLabel}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-950/[0.03] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Ready to plan
            </p>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {trip.budget != null
                ? `${formatCurrency(trip.budget, trip.budget_currency)} target budget`
                : 'No budget limit set yet'}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function InsightCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="metric-tile px-4 py-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--color-text-muted)' }}>
        {hint}
      </p>
    </div>
  );
}

function PublicPreviewCard({ trip }: { trip: Trip }) {
  const coverUrl = normalizePublicStorageUrl(trip.cover_image_url);
  const hasCover = !!coverUrl;

  return (
    <Link href={`/trips/${trip.id}`} className="group block overflow-hidden rounded-[1.75rem] section-shell animate-in slide-up">
      <div className="relative h-44 overflow-hidden rounded-t-[1.75rem]">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl!}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="hero-orb h-full w-full">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/15" />
            <div className="absolute left-6 top-10 h-16 w-16 rounded-full bg-white/12" />
          </div>
        )}

        <div className="trip-hero-overlay absolute inset-0" />

        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
            style={{ backgroundColor: VISIBILITY_CONFIG.public.bg, color: VISIBILITY_CONFIG.public.color }}
          >
            {VISIBILITY_CONFIG.public.icon}
            {VISIBILITY_CONFIG.public.label}
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
            <Clock3 className="h-3 w-3" />
            Updated {formatDateTime(trip.updated_at, { includeYear: false })}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-white section-title">
            {trip.title}
          </h3>
          {trip.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/74">
              {trip.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="mini-stat px-3 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            Schedule
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>
            {trip.start_date && trip.end_date ? formatDateRange(trip.start_date, trip.end_date) : 'Dates flexible'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-stone-950/[0.03] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Public preview
            </p>
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              Explore itinerary, places, and map
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function GuestLanding({ publicTrips }: { publicTrips: Trip[] }) {
  return (
    <div className="animate-in fade-in duration-300">
      <section className="hero-orb relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative max-w-lg">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Mobile-first planning
          </p>
          <h1 className="text-3xl font-semibold leading-tight section-title sm:text-4xl">
            Plan your next adventure together.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/78 sm:text-base">
            Collect places, vote as a group, track shared spending, and keep the whole trip moving from one calm workspace.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5">
              Create your own trip
            </Link>
            <Link href="/sign-in" className="rounded-2xl bg-white/14 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-transform hover:-translate-y-0.5">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InsightCard
          label="Shared planning"
          value="Places + votes"
          hint="Add destinations and build consensus without leaving the same flow."
          icon={<Compass className="h-4 w-4" />}
        />
        <InsightCard
          label="Money clarity"
          value="Expenses + debts"
          hint="Track receipts, balances, and settlements in the same trip workspace."
          icon={<Wallet className="h-4 w-4" />}
        />
        <InsightCard
          label="Group rhythm"
          value="Members + activity"
          hint="Know what changed, who joined, and what still needs attention."
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Public trips
            </p>
            <h2 className="mt-1 text-2xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
              Explore trips anyone can preview
            </h2>
          </div>
          <Link href="/sign-up" className="hidden rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5 sm:inline-flex">
            Create your own
          </Link>
        </div>

        {publicTrips.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {publicTrips.map((trip) => (
              <PublicPreviewCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="section-shell rounded-[1.75rem] p-8 text-center">
            <p className="text-lg font-semibold section-title" style={{ color: 'var(--color-text)' }}>
              No public trips yet
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Public trip previews will show up here as soon as someone shares one.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) {
    const publicTrips = await getPublicTrips();
    return <GuestLanding publicTrips={publicTrips} />;
  }

  const trips = await getTrips();
  const tripMembers = await Promise.all(trips.map(async (trip) => getMembers(trip.id)));
  const activeTrips = trips.filter((trip) => trip.status !== 'archived');
  const publicTrips = trips.filter((trip) => trip.visibility === 'public');
  const budgetedTrips = trips.filter((trip) => trip.budget != null);
  const distinctMemberCount = new Set(
    tripMembers.flatMap((members) => members.map((member) => member.user_id))
  ).size;
  const nextTrip =
    [...trips]
      .filter((trip) => trip.start_date)
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)))[0] ?? null;

  if (trips.length === 0) {
    return (
      <div className="animate-in fade-in duration-300">
        <section className="hero-orb relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)]" />
          <div className="relative max-w-lg">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Mobile-first planning
            </p>
            <h1 className="text-3xl font-semibold leading-tight section-title sm:text-4xl">
              Plan your first adventure like a shared cockpit.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/78 sm:text-base">
              Collect places, vote as a group, track shared spending, and keep the whole trip moving from one calm workspace.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/trips/new" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5">
                Start a new trip
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InsightCard
            label="Shared planning"
            value="Places + votes"
            hint="Add destinations and build consensus without leaving the same flow."
            icon={<Compass className="h-4 w-4" />}
          />
          <InsightCard
            label="Money clarity"
            value="Expenses + debts"
            hint="Track receipts, balances, and settlements in the same trip workspace."
            icon={<Wallet className="h-4 w-4" />}
          />
          <InsightCard
            label="Group rhythm"
            value="Members + activity"
            hint="Know what changed, who joined, and what still needs attention."
            icon={<Users className="h-4 w-4" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <section className="hero-orb relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Travel OS
            </p>
            <h1 className="text-3xl font-semibold leading-tight section-title sm:text-4xl">
              Your trips, votes, spending, and crew in one calm mobile workspace.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {nextTrip ? (
              <div className="rounded-[1.4rem] bg-white/12 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Next up
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {nextTrip.title}
                </p>
                {nextTrip.start_date && nextTrip.end_date && (
                  <p className="mt-1 text-xs text-white/70">
                    {formatDateRange(nextTrip.start_date, nextTrip.end_date)}
                  </p>
                )}
              </div>
            ) : null}
            <Link href="/trips/new" className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5">
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New trip
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <InsightCard
          label="Trips"
          value={String(trips.length)}
          hint={`${activeTrips.length} active right now`}
          icon={<Compass className="h-4 w-4" />}
        />
        <InsightCard
          label="Public"
          value={String(publicTrips.length)}
          hint={`${trips.length - publicTrips.length} private plans`}
          icon={<Globe className="h-4 w-4" />}
        />
        <InsightCard
          label="Budgets"
          value={String(budgetedTrips.length)}
          hint={`${trips.length - budgetedTrips.length} still flexible`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <InsightCard
          label="Crew"
          value={String(distinctMemberCount)}
          hint={`${distinctMemberCount} distinct ${distinctMemberCount === 1 ? 'member' : 'members'} across your trips`}
          icon={<Users className="h-4 w-4" />}
        />
      </div>

      <div className="mb-4 mt-8">
        <h2 className="text-2xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
          My trips
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 stagger sm:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}
