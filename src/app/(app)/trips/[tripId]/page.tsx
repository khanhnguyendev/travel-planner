import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Receipt,
  Globe,
  Lock,
  UserCog,
  Crown,
  ShieldCheck,
  Pencil,
  Eye,
  Info,
  MapPin,
  Activity,
  Sparkles,
  Coins,
} from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers, hasRequestedJoin } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces, getCommentsByTripId } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpenses, getExpensesWithSplits } from '@/features/expenses/queries';
import { calculateMemberBalances } from '@/features/expenses/debt';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { formatCurrency, formatDate } from '@/lib/format';
import { PlacesSection } from '@/components/places/places-section';
import { TripTimeline } from '@/components/places/trip-timeline';
import { MapTabClient } from '@/components/places/map-tab-client';
import { DebtSummary } from '@/components/expenses/debt-summary';
import { Avatar } from '@/components/ui/avatar';
import { CoverImageUpload } from '@/components/trips/cover-image-upload';
import { BudgetEditor } from '@/components/trips/budget-editor';
import { TripDatesEditor } from '@/components/trips/trip-dates-editor';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { JoinRequestButton } from '@/components/members/join-request-button';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { AccommodationSection } from '@/components/places/accommodation-section';
import { PlaceMapLinks } from '@/components/places/place-map-links';
import { CheckInOutButton } from '@/components/places/check-in-out-button';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { getTripActivity } from '@/features/activity/queries';
import type { TripRole, Visibility, PlaceVote, PlaceReview, PlaceComment, Place } from '@/lib/types';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  return {
    title: trip?.title ?? 'Trip',
  };
}

function RoleBadge({ role }: { role: TripRole }) {
  const styles: Record<TripRole, { bg: string; text: string; icon: React.ReactNode }> = {
    owner: { bg: '#FEF3C7', text: '#92400E', icon: <Crown className="h-3 w-3" /> },
    admin: { bg: '#EDE9FE', text: '#5B21B6', icon: <ShieldCheck className="h-3 w-3" /> },
    editor: { bg: '#CCFBF1', text: '#0F766E', icon: <Pencil className="h-3 w-3" /> },
    viewer: { bg: '#F1F5F9', text: '#475569', icon: <Eye className="h-3 w-3" /> },
  };
  const s = styles[role];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.icon}
      {role}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === 'public';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: isPublic ? '#DBEAFE' : '#E2E8F0',
        color: isPublic ? '#1D4ED8' : '#475569',
      }}
    >
      {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {isPublic ? 'Public trip' : 'Private trip'}
    </span>
  );
}

function getTripPhase(trip: { start_date: string | null; end_date: string | null; status: string }) {
  if (trip.status === 'archived') return 'Archived';
  const today = new Date();
  const start = trip.start_date ? new Date(`${trip.start_date}T00:00:00`) : null;
  const end = trip.end_date ? new Date(`${trip.end_date}T23:59:59`) : null;

  if (start && end && today >= start && today <= end) return 'Traveling';
  if (start && today < start) return 'Planning';
  if (end && today > end) return 'Wrapped';
  return 'Planning';
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeToMinutes(value: string | null, fallback: number) {
  if (!value) return fallback;
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  return (hours * 60) + minutes;
}

function getStopPointers(places: Place[]) {
  const scheduledPlaces = [...places]
    .filter((place) => place.visit_date)
    .sort((a, b) => {
      const aValue = `${a.visit_date ?? ''}-${a.visit_time_from ?? '99:99'}`;
      const bValue = `${b.visit_date ?? ''}-${b.visit_time_from ?? '99:99'}`;
      return aValue.localeCompare(bValue);
    });

  if (scheduledPlaces.length === 0) {
    return { previous: null, current: null, next: null };
  }

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  const activeTodayIndex = scheduledPlaces.findIndex((place) => {
    if (place.visit_date !== todayKey) return false;
    const start = timeToMinutes(place.visit_time_from, 0);
    const end = timeToMinutes(place.visit_time_to, place.visit_time_from ? start + 90 : (24 * 60));
    return currentMinutes >= start && currentMinutes <= end;
  });

  const firstTodayIndex = scheduledPlaces.findIndex((place) => place.visit_date === todayKey);
  const currentIndex = activeTodayIndex !== -1 ? activeTodayIndex : firstTodayIndex;

  if (currentIndex !== -1) {
    return {
      previous: currentIndex > 0 ? scheduledPlaces[currentIndex - 1] : null,
      current: scheduledPlaces[currentIndex],
      next: currentIndex < scheduledPlaces.length - 1 ? scheduledPlaces[currentIndex + 1] : null,
    };
  }

  const nextIndex = scheduledPlaces.findIndex((place) => {
    if (!place.visit_date) return false;
    if (place.visit_date > todayKey) return true;
    if (place.visit_date < todayKey) return false;
    return timeToMinutes(place.visit_time_from, 24 * 60) > currentMinutes;
  });

  if (nextIndex === -1) {
    return {
      previous: scheduledPlaces[scheduledPlaces.length - 1],
      current: null,
      next: null,
    };
  }

  return {
    previous: nextIndex > 0 ? scheduledPlaces[nextIndex - 1] : null,
    current: null,
    next: scheduledPlaces[nextIndex],
  };
}

function SnapshotPill({
  icon,
  label,
  value,
  className,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`mini-stat flex min-w-[172px] items-center gap-3 px-3 py-3 ${className ?? ''}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
          {label}
        </p>
        <div className="mt-1 flex items-start gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug section-title" style={{ color: 'var(--color-text)' }}>
            {value}
          </p>
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

function getBalancePresentation(net: number, currency: string) {
  if (Math.abs(net) < 0.01) {
    return {
      label: 'Settled',
      value: `0 ${currency}`,
      color: 'var(--color-text-subtle)',
    };
  }

  if (net > 0) {
    return {
      label: 'Gets back',
      value: formatCurrency(net, currency),
      color: '#0F766E',
    };
  }

  return {
    label: 'Owes',
    value: formatCurrency(Math.abs(net), currency),
    color: '#B45309',
  };
}

function formatStopPlan(place: Place): string {
  const parts: string[] = [];
  if (place.visit_date) {
    parts.push(
      new Date(`${place.visit_date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    );
  }
  if (place.visit_time_from || place.visit_time_to) {
    parts.push(`${place.visit_time_from ?? '?'} - ${place.visit_time_to ?? '?'}`);
  }
  if (place.checkout_date) {
    parts.push(`Checkout ${formatDate(place.checkout_date)}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No schedule yet';
}

function StopSpotlightCard({
  label,
  place,
  emptyLabel,
  tone,
  canEdit,
  allDayPlaces,
  tripId,
}: {
  label: string;
  place: Place | null;
  emptyLabel: string;
  tone: 'previous' | 'current' | 'next';
  canEdit: boolean;
  allDayPlaces: Place[];
  tripId: string;
}) {
  const toneStyles: Record<'previous' | 'current' | 'next', { chipBg: string; chipText: string; panelBg: string }> = {
    previous: { chipBg: '#E2E8F0', chipText: '#475569', panelBg: 'rgba(255,255,255,0.72)' },
    current: { chipBg: '#CCFBF1', chipText: '#0F766E', panelBg: '#ECFDF5' },
    next: { chipBg: '#DBEAFE', chipText: '#1D4ED8', panelBg: '#EFF6FF' },
  };
  const styles = toneStyles[tone];

  return (
    <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            Stop
          </p>
          <div
            className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ backgroundColor: styles.chipBg, color: styles.chipText }}
          >
            {label}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold leading-tight section-title" style={{ color: 'var(--color-text)' }}>
          {place?.name ?? emptyLabel}
        </h3>
        <p className="mt-1 min-h-[2.75rem] text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
          {place?.address ?? (place ? 'Address not available yet.' : 'No scheduled place is mapped to this slot yet.')}
        </p>
      </div>

      <div className="mt-4 rounded-[1.2rem] px-3 py-3" style={{ backgroundColor: styles.panelBg }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
          Schedule plan
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {place ? formatStopPlan(place) : 'No plan yet'}
        </p>
        {place?.visit_date && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Planned for {formatDate(place.visit_date)}
          </p>
        )}
      </div>

      {place && (
        <div className="mt-4">
          <PlaceMapLinks place={place} />
        </div>
      )}

      {canEdit && place && (
        <div className="mt-4">
          <CheckInOutButton
            place={place}
            allDayPlaces={allDayPlaces}
            tripId={tripId}
          />
        </div>
      )}
    </div>
  );
}

type TabValue = 'places' | 'timeline' | 'map' | 'expenses' | 'activity';

function TabBar({
  activeTab,
  tripId,
  tabs,
}: {
  activeTab: TabValue;
  tripId: string;
  tabs: TabValue[];
}) {
  const tabItems: { label: string; value: TabValue; icon: React.ReactNode }[] = [
    { label: 'Places', value: 'places', icon: <MapPin className="h-3.5 w-3.5" /> },
    { label: 'Plan', value: 'timeline', icon: <Calendar className="h-3.5 w-3.5" /> },
    { label: 'Map', value: 'map', icon: <Globe className="h-3.5 w-3.5" /> },
    { label: 'Money', value: 'expenses', icon: <Coins className="h-3.5 w-3.5" /> },
    { label: 'Activity', value: 'activity', icon: <Activity className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="sticky-tabs mt-4 mb-5">
      <div className="section-shell overflow-x-auto p-2">
        <div className="flex min-w-max items-center gap-2">
          {tabItems
            .filter((tab) => tabs.includes(tab.value))
            .map((tab) => {
              const isActive = tab.value === activeTab;
              return (
                <Link
                  key={tab.value}
                  href={`/trips/${tripId}?tab=${tab.value}`}
                  className={`pill-tab flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isActive ? 'pill-tab-active' : ''}`}
                  style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tripId } = await params;
  const { tab: tabParam } = await searchParams;
  const user = await getSession();

  const [trip, role, members, categories, expenses] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getCategories(tripId),
    getExpenses(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  const effectiveRole: TripRole | null =
    role ?? (trip.visibility === 'public' ? 'viewer' : null);
  if (!effectiveRole) {
    notFound();
  }

  const resolvedRole = effectiveRole as TripRole;
  const currentUserId = user?.id ?? '';
  const isMember = role != null;
  const joinRequested = !isMember && trip.visibility === 'public' && user
    ? await hasRequestedJoin(tripId, user.id)
    : false;
  const visibleTabs: TabValue[] = isMember
    ? ['places', 'timeline', 'map', 'expenses', 'activity']
    : ['places', 'timeline', 'map'];
  const activeTab: TabValue =
    tabParam && visibleTabs.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : 'places';
  const isArchived = trip.status === 'archived';
  const canEdit = isMember && ['owner', 'admin', 'editor'].includes(resolvedRole);
  const canManage = isMember && ['owner', 'admin'].includes(resolvedRole);
  const canVote = isMember && !isArchived;
  const canComment = isMember;

  const places = await getPlaces(tripId);

  const [voteSummaries, userVotesRaw, reviewsRaw, commentsRaw, expensesWithSplits, activityEntries] =
    await Promise.all([
      getVoteSummary(tripId),
      user && isMember ? Promise.all(places.map((place) => getUserVote(place.id, user.id))) : [],
      (async () => {
        if (places.length === 0) return [];
        const supabase = await createClient();
        const { data } = await supabase
          .from('place_reviews')
          .select('*')
          .in(
            'place_id',
            places.map((place) => place.id)
          );
        return data ?? [];
      })(),
      getCommentsByTripId(tripId),
      isMember ? getExpensesWithSplits(tripId) : [],
      isMember ? getTripActivity(tripId) : [],
    ]);

  const userVotes = userVotesRaw.filter(Boolean) as PlaceVote[];

  const reviewsByPlaceId: Record<string, PlaceReview[]> = {};
  for (const review of reviewsRaw as PlaceReview[]) {
    if (!reviewsByPlaceId[review.place_id]) {
      reviewsByPlaceId[review.place_id] = [];
    }
    reviewsByPlaceId[review.place_id].push(review);
  }

  const commentsByPlaceId: Record<string, PlaceComment[]> = {};
  for (const comment of commentsRaw) {
    if (!commentsByPlaceId[comment.place_id]) {
      commentsByPlaceId[comment.place_id] = [];
    }
    commentsByPlaceId[comment.place_id].push(comment);
  }

  const commentAuthors: Record<string, string> = {};
  for (const member of members) {
    commentAuthors[member.user_id] = member.profile.display_name ?? 'Member';
  }

  const memberProfiles = members.map((member) => ({
    id: member.profile.id,
    display_name: member.profile.display_name,
    avatar_url: member.profile.avatar_url,
    user_id: member.user_id,
  }));

  const tripPhase = getTripPhase(trip);
  const stopPointers = getStopPointers(places);
  const scheduledPlaces = places.filter((place) => place.visit_date);
  const totalsByCurrency: Record<string, number> = {};
  for (const expense of expenses) {
    totalsByCurrency[expense.currency] = (totalsByCurrency[expense.currency] ?? 0) + expense.amount;
  }
  const showCoverMedia = canManage || Boolean(trip.cover_image_url);
  const recentExpenses = expensesWithSplits.slice(0, 5);
  const balanceCurrency = trip.budget_currency || expensesWithSplits[0]?.currency || 'VND';
  const memberBalanceMap = new Map(
    calculateMemberBalances(expensesWithSplits, {
      budgetAmount: trip.budget,
      budgetCurrency: trip.budget_currency,
      budgetPayerUserId: trip.budget_payer_user_id,
      memberUserIds: members.map((member) => member.user_id),
    })
      .filter((balance) => balance.currency === balanceCurrency)
      .map((balance) => [balance.userId, balance.net])
  );
  const sortedCrewMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    const roleOrder: Record<TripRole, number> = { owner: 0, admin: 1, editor: 2, viewer: 3 };
    const roleDiff = roleOrder[a.role] - roleOrder[b.role];
    if (roleDiff !== 0) return roleDiff;
    return (a.joined_at ?? '').localeCompare(b.joined_at ?? '');
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="section-shell px-4 pb-1 pt-2 text-center sm:px-5">
        <h1 className="text-3xl font-semibold leading-tight section-title sm:text-[2.5rem]" style={{ color: 'var(--color-text)' }}>
          {trip.title}
        </h1>
        {trip.description && (
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-text-muted)' }}>
            {trip.description}
          </p>
        )}
      </div>

      <section className="section-shell p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.96fr)_minmax(360px,1.12fr)_minmax(300px,0.82fr)] xl:items-start">
          <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4 sm:p-5">
            <div className="flex h-full flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Trip overview
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.9fr)] lg:items-start">
                <div>
                  <h1 className="text-3xl font-semibold leading-tight section-title sm:text-[2.25rem]" style={{ color: 'var(--color-text)' }}>
                    {trip.title}
                  </h1>
                  {trip.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-text-muted)' }}>
                      {trip.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={user ? '/dashboard' : '/'}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
                    >
                      {user ? 'Dashboard' : 'Home'}
                    </Link>
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    >
                      <Sparkles className="h-3 w-3" />
                      {tripPhase}
                    </span>
                    <RoleBadge role={resolvedRole} />
                    <VisibilityBadge visibility={trip.visibility} />
                    {isArchived && (
                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
                      >
                        Archived
                      </span>
                    )}
                  </div>

                  {!isMember && (
                    <div className="mt-4 max-w-xl rounded-[1.2rem] border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
                      <div className="flex items-start gap-2">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <p>
                          This is a public trip preview. Places, map, and timeline stay visible here, while invites, comments, votes, and spending remain member-only.
                        </p>
                      </div>
                      <JoinRequestButton
                        tripId={tripId}
                        isAuthenticated={!!user}
                        alreadyRequested={joinRequested}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="min-w-0">
                    <SnapshotPill
                      label="Planning dates"
                      value={trip.start_date && trip.end_date ? formatDateRange(trip.start_date, trip.end_date) : 'Flexible'}
                      icon={<Calendar className="h-4 w-4" />}
                      className="min-w-0"
                      action={(
                        <TripDatesEditor
                          tripId={tripId}
                          startDate={trip.start_date}
                          endDate={trip.end_date}
                          canManage={canManage}
                        />
                      )}
                    />
                  </div>
                  <SnapshotPill
                    label="Places"
                    value={`${places.length} saved · ${scheduledPlaces.length} scheduled`}
                    icon={<MapPin className="h-4 w-4" />}
                    className="min-w-0"
                  />
                </div>
              </div>

              {showCoverMedia ? (
                <div className="rounded-[1.25rem] bg-white/70 p-3">
                  <div className="mb-3 px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                      Cover setting
                    </p>
                    <p className="mt-1 text-sm font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                      Trip media
                    </p>
                  </div>
                  <div className="overflow-hidden rounded-[1.25rem]">
                    {canManage ? (
                      <CoverImageUpload tripId={tripId} currentCoverUrl={trip.cover_image_url} height={180} />
                    ) : trip.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={trip.cover_image_url}
                        alt={`${trip.title} cover`}
                        className="h-[180px] w-full object-cover"
                      />
                    ) : (
                      <div className="hero-orb h-[180px] w-full" />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4">
            <div className="mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Budget
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Shared budget, recent funding, and the latest spend.
              </p>
            </div>

            <BudgetEditor
              tripId={tripId}
              budget={trip.budget}
              budgetCurrency={trip.budget_currency}
              budgetPayerUserId={trip.budget_payer_user_id}
              canManage={canManage}
              totalSpent={totalsByCurrency[trip.budget_currency] ?? 0}
              members={members}
              actionSlot={canEdit ? (
                <AddExpenseDialog
                  tripId={tripId}
                  members={members}
                  currentUserId={currentUserId}
                  places={places}
                  trigger={(
                    <button
                      type="button"
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Add expense
                    </button>
                  )}
                />
              ) : null}
            />

            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Recent transactions
                </p>
                {isMember && recentExpenses.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    Last {Math.min(recentExpenses.length, 5)}
                  </span>
                )}
              </div>

              {!isMember ? (
                <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Spending stays inside the crew workspace. Join the trip to review recent transactions and balances.
                </div>
              ) : recentExpenses.length === 0 ? (
                <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  No transactions yet. Add income or log the first shared expense to start the trip ledger.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentExpenses.map((expense, index) => (
                    <Link
                      key={expense.id}
                      href={`/trips/${tripId}/expenses/${expense.id}`}
                      className={`${index >= 3 ? 'hidden lg:flex' : 'flex'} items-center justify-between gap-3 rounded-[1.2rem] bg-white/70 px-3 py-3 transition-transform hover:-translate-y-0.5`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {expense.title}
                        </p>
                        <p className="mt-1 truncate text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                          {expense.paid_by_profile.display_name ?? 'Member'}
                          {expense.category ? ` · ${expense.category}` : ''}
                          {expense.expense_date ? ` · ${formatDate(expense.expense_date)}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                          {expense.splits.length} split{expense.splits.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Crew
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canManage && <InviteLinkButton tripId={tripId} />}
                {isMember && (
                  <Link
                    href={`/trips/${tripId}/members`}
                    className="inline-flex min-h-[36px] items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <UserCog className="h-4 w-4" />
                    Manage
                  </Link>
                )}
              </div>
            </div>

            {isMember ? (
              <div className="space-y-2">
                {sortedCrewMembers.map((member) => {
                  const balanceNet = memberBalanceMap.get(member.user_id) ?? 0;
                  const balanceInfo = getBalancePresentation(balanceNet, balanceCurrency);
                  const name = member.profile.display_name ?? 'Unknown member';

                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-[1.2rem] bg-white/70 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          user={{ display_name: name, avatar_url: member.profile.avatar_url }}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                            {name}{member.user_id === currentUserId ? ' (you)' : ''}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <RoleBadge role={member.role} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-subtle)' }}>
                          {balanceInfo.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold" style={{ color: balanceInfo.color }}>
                          {balanceInfo.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Join the trip to vote, comment, add places, manage crew, and track shared spending.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell p-4 mt-4 sm:p-5">
        <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Trip stops
              </p>
              <h2 className="mt-1 text-lg font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                Previous, current, and next
              </h2>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <StopSpotlightCard
              label="Previous stop"
              place={stopPointers.previous}
              emptyLabel="None yet"
              tone="previous"
              canEdit={canEdit}
              allDayPlaces={stopPointers.previous?.visit_date ? places.filter((p) => p.visit_date === stopPointers.previous!.visit_date) : []}
              tripId={tripId}
            />
            <StopSpotlightCard
              label="Current"
              place={stopPointers.current}
              emptyLabel={scheduledPlaces.length > 0 ? 'No stop today' : 'Not scheduled'}
              tone="current"
              canEdit={canEdit}
              allDayPlaces={stopPointers.current?.visit_date ? places.filter((p) => p.visit_date === stopPointers.current!.visit_date) : []}
              tripId={tripId}
            />
            <StopSpotlightCard
              label="Next stop"
              place={stopPointers.next}
              emptyLabel={scheduledPlaces.length > 0 ? 'Nothing ahead' : 'Not scheduled'}
              tone="next"
              canEdit={canEdit}
              allDayPlaces={stopPointers.next?.visit_date ? places.filter((p) => p.visit_date === stopPointers.next!.visit_date) : []}
              tripId={tripId}
            />
          </div>
        </div>
      </section>

      <TabBar activeTab={activeTab} tripId={tripId} tabs={visibleTabs} />

      {activeTab === 'places' && (
        <div className="mb-6">
          <PlacesSection
            tripId={tripId}
            role={resolvedRole}
            initialPlaces={places}
            initialCategories={categories}
            initialVoteSummaries={voteSummaries}
            initialUserVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={currentUserId}
            canVote={canVote}
            canComment={canComment}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
          />

          <div className="mt-4">
            <AccommodationSection
              places={places}
              categories={categories}
              tripId={tripId}
              currentUserId={currentUserId}
              canEdit={canEdit}
              canVote={canVote}
              canComment={canComment}
              voteSummaries={voteSummaries}
              userVotes={userVotes}
              reviewsByPlaceId={reviewsByPlaceId}
              commentsByPlaceId={commentsByPlaceId}
              commentAuthors={commentAuthors}
              tripStartDate={trip.start_date}
              tripEndDate={trip.end_date}
            />
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="section-shell mb-6 p-5 sm:p-6">
          <TripTimeline
            places={places}
            categories={categories}
            tripId={tripId}
            currentUserId={currentUserId}
            canEdit={canEdit}
            canVote={canVote}
            canComment={canComment}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
          />
        </div>
      )}

      {activeTab === 'map' && (
        <div className="mb-6">
          <MapTabClient
            tripId={tripId}
            places={places}
            categories={categories}
            canVote={canVote}
            canComment={canComment}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={currentUserId}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
          />
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="mb-6 space-y-4">
          {expensesWithSplits.length > 0 && (
            <DebtSummary
              expenses={expensesWithSplits}
              members={memberProfiles}
              currentUserId={currentUserId}
            />
          )}

          <div className="section-shell p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Money
                </p>
                <h2 className="mt-1 text-xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                  Shared expenses
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {expenses.length > 0 ? `${expenses.length} expense entries across ${Object.keys(totalsByCurrency).length} currencies` : 'No expenses added yet'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <AddExpenseDialog
                    tripId={tripId}
                    members={members}
                    currentUserId={currentUserId}
                    places={places}
                  />
                )}
                <Link href={`/trips/${tripId}/expenses`} className="btn-secondary min-h-[44px] text-sm">
                  View all
                </Link>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="rounded-[1.5rem] bg-stone-950/[0.03] px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Receipt className="h-6 w-6" style={{ color: 'var(--color-text-subtle)' }} />
                </div>
                <p className="text-base font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                  Track your first shared expense
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Add transport, food, tickets, and receipts here so balances stay clear for everyone.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 4).map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/trips/${tripId}/expenses/${expense.id}`}
                    className="mini-stat flex min-h-[56px] items-center justify-between gap-3 px-4 py-3 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {expense.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        {expense.category ?? 'General'}{expense.expense_date ? ` · ${expense.expense_date}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="mb-6">
          <ActivityFeed activities={activityEntries} />
        </div>
      )}
    </div>
  );
}
