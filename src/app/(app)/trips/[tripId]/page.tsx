import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Globe,
  Lock,
  UserCog,
  Crown,
  ShieldCheck,
  Pencil,
  Eye,
  Info,
  MapPin,
  Sparkles,
  Users,
  Settings,
} from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { getTrip, getUserRole, getBudgetContributions } from '@/features/trips/queries';
import { getJoinRequests, getMembers, hasRequestedJoin } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces, getCommentsByTripId } from '@/features/places/queries';
import { getTagsByTrip } from '@/features/tags/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpensesWithSplits } from '@/features/expenses/queries';
import { calculateMemberBalances } from '@/features/expenses/debt';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { getTripDurationLabel, getTripNow, getTripTodayKey } from '@/lib/date';
import { normalizePublicStorageUrl } from '@/lib/storage';
import { ExpenseSummaryCard } from '@/components/expenses/expense-summary-card';
import { CoverImageUpload } from '@/components/trips/cover-image-upload';
import { BudgetEditor } from '@/components/trips/budget-editor';
import { AddMoneyDialog } from '@/components/trips/add-money-dialog';
import { TripMobileActionDock } from '@/components/trips/trip-mobile-action-dock';
import { TripTabsShell, type TripTabValue as TabValue } from '@/components/trips/trip-tabs-shell';
import { TripSectionRefreshBoundary } from '@/components/trips/trip-refresh';
import { CrewCardList } from '@/components/trips/crew-card-list';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { JoinRequestButton } from '@/components/members/join-request-button';
import { AccommodationSection } from '@/components/places/accommodation-section';
import { TransportSection, TransportSectionTrigger } from '@/components/transport/transport-section';
import { getTransportBookings } from '@/features/transport/queries';
import { StopSpotlightCard } from '@/components/places/stop-spotlight-card';
import { getTripActivity } from '@/features/activity/queries';
import type { TripRole, Visibility, PlaceVote, PlaceReview, PlaceComment, Place, PlaceExpenseHistoryEntry } from '@/lib/types';
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
      className="inline-flex max-w-full flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize sm:px-3 sm:text-xs"
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
      className="inline-flex max-w-full flex-shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs"
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
  const now = getTripNow();
  // Construct dates for comparison using the same "local" components
  const todayStr = getTripTodayKey();
  const start = trip.start_date || '';
  const end = trip.end_date || '';

  if (start && end && todayStr >= start && todayStr <= end) return 'Traveling';
  if (start && todayStr < start) return 'Planning';
  if (end && todayStr > end) return 'Wrapped';
  return 'Planning';
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

  const now = getTripNow();
  const todayKey = getTripTodayKey();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

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
  };
}

function getTransportLabel(type: 'rent' | 'bus' | 'plane') {
  if (type === 'rent') return 'Car rental';
  if (type === 'bus') return 'Bus';
  return 'Flight';
}

function SnapshotPill({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`mini-stat flex min-w-0 items-center gap-3 px-3 py-3 ${className ?? ''}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
          {label}
        </p>
        <p className="mt-1 min-w-0 break-words text-sm font-semibold leading-snug section-title" style={{ color: 'var(--color-text)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function formatSnapshotDate(value: string | null) {
  if (!value) return 'Not set';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildRefreshSignature(parts: Array<string | number | null | undefined>) {
  return parts.map((part) => (part == null ? '' : String(part))).join('|');
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

  const [trip, role, members, categories, contributions] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getCategories(tripId),
    getBudgetContributions(tripId),
  ]);

  if (!trip) {
    notFound();
  }

  const coverUrl = normalizePublicStorageUrl(trip.cover_image_url);

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
  const joinRequests = canManage ? await getJoinRequests(tripId) : [];

  const [places, tags] = await Promise.all([
    getPlaces(tripId),
    getTagsByTrip(tripId),
  ]);

  const [voteSummaries, userVotesRaw, reviewsRaw, commentsRaw, expensesWithSplits, activityEntries, transportBookings] =
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
      isMember ? getTransportBookings(tripId) : [],
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
  const accommodationCategoryIds = new Set(
    categories
      .filter((category) => category.category_type === 'accommodation')
      .map((category) => category.id)
  );
  const accommodationPlaces = places.filter((place) => accommodationCategoryIds.has(place.category_id));
  const planningPlaces = places.filter((place) => !accommodationCategoryIds.has(place.category_id));
  const primaryAccommodation = accommodationPlaces[0] ?? null;
  const stopPointers = getStopPointers(planningPlaces);
  const planningScheduledPlaces = planningPlaces.filter((place) => place.visit_date);
  const scheduledPlacesCount = places.filter((place) => place.visit_date).length;
  const tripDurationLabel = getTripDurationLabel(trip.start_date, trip.end_date);
  const placeNameById = Object.fromEntries(places.map((place) => [place.id, place.name]));
  const placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]> = {};
  for (const expense of expensesWithSplits) {
    if (!expense.place_id) continue;
    if (!placeExpensesByPlaceId[expense.place_id]) {
      placeExpensesByPlaceId[expense.place_id] = [];
    }
    placeExpensesByPlaceId[expense.place_id].push({
      id: expense.id,
      trip_id: expense.trip_id,
      place_id: expense.place_id,
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      expense_date: expense.expense_date,
      note: expense.note,
      category: expense.category,
      receipt_path: expense.receipt_path,
      created_at: expense.created_at,
      paid_by_name: expense.paid_by_profile.display_name,
      splits_count: expense.splits.length,
      split_participants: expense.splits.map((split) => ({
        user_id: split.user_id,
        display_name: split.profile.display_name,
        avatar_url: split.profile.avatar_url,
      })),
    });
  }
  const transportExpensesByBookingId: Record<string, PlaceExpenseHistoryEntry[]> = {};
  for (const expense of expensesWithSplits) {
    if (!expense.transport_booking_id) continue;
    if (!transportExpensesByBookingId[expense.transport_booking_id]) {
      transportExpensesByBookingId[expense.transport_booking_id] = [];
    }
    transportExpensesByBookingId[expense.transport_booking_id].push({
      id: expense.id,
      trip_id: expense.trip_id,
      place_id: expense.transport_booking_id,
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      expense_date: expense.expense_date,
      note: expense.note,
      category: expense.category,
      receipt_path: expense.receipt_path,
      created_at: expense.created_at,
      paid_by_name: expense.paid_by_profile.display_name,
      splits_count: expense.splits.length,
      split_participants: expense.splits.map((split) => ({
        user_id: split.user_id,
        display_name: split.profile.display_name,
        avatar_url: split.profile.avatar_url,
      })),
    });
  }

  const transportNameById: Record<string, string> = {};
  const transportTypeById: Record<string, 'rent' | 'bus' | 'plane'> = {};
  for (const b of transportBookings) {
    if (!b.id) continue;
    transportTypeById[b.id] = b.transport_type;
    transportNameById[b.id] = b.provider || b.from_location || getTransportLabel(b.transport_type);
  }

  const totalsByCurrency: Record<string, number> = {};
  for (const expense of expensesWithSplits) {
    totalsByCurrency[expense.currency] = (totalsByCurrency[expense.currency] ?? 0) + expense.amount;
  }
  // Pool-paid expenses: deduct from the shared income pool
  const poolSpent = expensesWithSplits
    .filter((e) => e.paid_from_pool && e.currency === (trip.budget_currency || 'VND'))
    .reduce((sum, e) => sum + e.amount, 0);
  const recentExpenses = expensesWithSplits.slice(0, 5);
  const balanceCurrency = trip.budget_currency || expensesWithSplits[0]?.currency || 'VND';
  const memberBalanceMap = new Map(
    calculateMemberBalances(expensesWithSplits)
      .filter((balance) => balance.currency === balanceCurrency)
      .map((balance) => [balance.userId, balance.net])
  );
  // Add income contributions to each member's balance
  for (const c of contributions) {
    if (c.currency === balanceCurrency) {
      memberBalanceMap.set(c.user_id, (memberBalanceMap.get(c.user_id) ?? 0) + c.amount);
    }
  }
  const memberContributionMap = new Map<string, number>();
  for (const c of contributions) {
    if (c.currency === balanceCurrency) {
      memberContributionMap.set(c.user_id, (memberContributionMap.get(c.user_id) ?? 0) + c.amount);
    }
  }
  // Sum each member's split portions (what they owe) across all expenses
  const memberSplitMap = new Map<string, number>();
  for (const expense of expensesWithSplits) {
    if (expense.currency === balanceCurrency) {
      for (const split of expense.splits) {
        memberSplitMap.set(split.user_id, (memberSplitMap.get(split.user_id) ?? 0) + split.amount_owed);
      }
    }
  }

  const sortedCrewMembers = [...members].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
    const roleOrder: Record<TripRole, number> = { owner: 0, admin: 1, editor: 2, viewer: 3 };
    const roleDiff = roleOrder[a.role] - roleOrder[b.role];
    if (roleDiff !== 0) return roleDiff;
    return (a.joined_at ?? '').localeCompare(b.joined_at ?? '');
  });
  const crewWithStats = sortedCrewMembers.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    profile: { display_name: m.profile.display_name, avatar_url: m.profile.avatar_url },
    balanceNet: memberBalanceMap.get(m.user_id) ?? 0,
    contributions: memberContributionMap.get(m.user_id) ?? 0,
    paid: memberSplitMap.get(m.user_id) ?? 0,
  }));

  const crewIdentityLabel = joinRequests.length > 0
    ? `${members.length} joined · ${joinRequests.length} requested`
    : `${members.length} crew joined`;
  const placesSurfaceSignature = buildRefreshSignature([
    places.map((place) => [
      place.id,
      place.category_id,
      place.visit_date,
      place.visit_date_end,
      place.visit_time_from,
      place.visit_time_to,
      place.checkout_date,
      place.backup_place_id,
      place.note,
      place.actual_checkin_at,
      place.actual_checkout_at,
    ].join(':')).join(','),
    categories.map((category) => [category.id, category.name, category.category_type].join(':')).join(','),
    Object.values(placeExpensesByPlaceId).flat().map((expense) => `${expense.id}:${expense.amount}:${expense.created_at}`).join(','),
    Object.entries(commentsByPlaceId).map(([placeId, items]) => `${placeId}:${items.length}`).join(','),
  ]);
  const stopsSignature = buildRefreshSignature([
    planningScheduledPlaces.map((place) => [
      place.id,
      place.visit_date,
      place.visit_time_from,
      place.visit_time_to,
      place.actual_checkin_at,
      place.actual_checkout_at,
    ].join(':')).join(','),
    stopPointers.previous?.id,
    stopPointers.current?.id,
    stopPointers.next?.id,
  ]);
  const budgetSignature = buildRefreshSignature([
    trip.budget ?? 'none',
    trip.budget_currency,
    totalsByCurrency[trip.budget_currency] ?? 0,
    poolSpent,
    contributions.map((contribution) => `${contribution.id}:${contribution.amount}:${contribution.currency}:${contribution.created_at}`).join(','),
    recentExpenses.map((expense) => `${expense.id}:${expense.amount}:${expense.currency}:${expense.created_at}:${expense.expense_date ?? ''}`).join(','),
  ]);
  const crewSignature = buildRefreshSignature([
    sortedCrewMembers.map((member) => `${member.id}:${member.role}:${member.joined_at}`).join(','),
    Array.from(memberBalanceMap.entries()).map(([userId, net]) => `${userId}:${net}`).join(','),
  ]);
  const expensesSignature = buildRefreshSignature([
    expensesWithSplits.map((expense) => `${expense.id}:${expense.amount}:${expense.currency}:${expense.created_at}:${expense.expense_date ?? ''}`).join(','),
    expensesWithSplits.map((expense) => `${expense.id}:${expense.splits.length}:${expense.paid_by_user_id}:${expense.title}:${expense.place_id ?? ''}`).join(','),
  ]);
  const activitySignature = buildRefreshSignature(
    activityEntries.map((entry) => `${entry.id}:${entry.action}:${entry.created_at}`)
  );

  return (
    <div className="animate-in fade-in overflow-x-hidden duration-300">
      <div className="px-4 pb-2 pt-2 sm:px-6">
        <div className="relative mx-auto min-h-[176px] max-w-4xl overflow-hidden rounded-[1.9rem] border text-center shadow-[0_18px_42px_rgba(87,67,40,0.08)] sm:min-h-[212px]" style={{ borderColor: 'rgba(255,255,255,0.42)' }}>
          {canManage ? (
            <CoverImageUpload
              tripId={tripId}
              currentCoverUrl={coverUrl}
              variant="identity"
            />
          ) : coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`${trip.title} cover`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="hero-orb absolute inset-0" />
          )}

          {canManage && (
            <Link
              href={`/trips/${tripId}/settings`}
              className="absolute left-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
              title="Trip settings"
              aria-label="Trip settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,17,0.08)_0%,rgba(10,12,17,0.18)_38%,rgba(10,12,17,0.42)_100%)]" />
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
          <div className="relative z-10 flex min-h-[176px] flex-col items-center justify-center px-5 py-6 sm:min-h-[212px] sm:px-8 sm:py-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
              <MapPin className="h-3.5 w-3.5" />
              Trip identity
            </span>

            <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02] section-title text-white sm:text-[2.9rem]" style={{ textShadow: '0 12px 28px rgba(10,12,17,0.30)' }}>
              {trip.title}
            </h1>

            {trip.description && (
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/78 sm:text-base">
                {trip.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1.5 text-xs font-medium text-white/86 backdrop-blur-sm">
                <Users className="h-3.5 w-3.5" />
                {crewIdentityLabel}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Link
                href={user ? '/dashboard' : '/'}
                className="inline-flex min-h-[34px] items-center rounded-full bg-white/14 px-3 py-1 text-xs font-medium text-white/84 backdrop-blur-sm transition-colors hover:bg-white/20"
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
                  className="inline-flex items-center rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/84 backdrop-blur-sm"
                >
                  Archived
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="section-shell p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,0.96fr)_minmax(360px,1.12fr)_minmax(300px,0.82fr)] xl:items-start">
          <div className="overflow-hidden rounded-[1.5rem] bg-stone-950/[0.03] p-4 sm:p-5">
            <div className="flex h-full flex-col gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Trip overview
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.2rem] bg-white/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                      Planning dates
                    </p>
                    {tripDurationLabel && (
                      <span
                        className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold shadow-sm"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {tripDurationLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="mini-stat flex min-w-0 items-center gap-3 overflow-hidden px-3 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                          From date
                        </p>
                        <div className="mt-1 flex items-start gap-2">
                          <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug section-title" style={{ color: 'var(--color-text)' }}>
                            {formatSnapshotDate(trip.start_date)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mini-stat flex min-w-0 items-center gap-3 overflow-hidden px-3 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                          To date
                        </p>
                        <div className="mt-1 flex items-start gap-2">
                          <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug section-title" style={{ color: 'var(--color-text)' }}>
                            {formatSnapshotDate(trip.end_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <SnapshotPill
                  label="Places"
                  value={`${places.length} saved · ${scheduledPlacesCount} scheduled`}
                  icon={<MapPin className="h-4 w-4" />}
                  className="min-w-0"
                />
              </div>

              {!isMember && (
                <div className="max-w-xl rounded-[1.2rem] border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      This is a public trip preview. Places, map, and timeline stay visible here, while live crew activity, trip stops, votes, comments, and spending remain member-only.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          <TripSectionRefreshBoundary
            tripId={tripId}
            sections={TRIP_REFRESH_SECTIONS.budget}
            signature={budgetSignature}
            label="Updating money"
          >
            <div className="overflow-hidden rounded-[1.5rem] bg-stone-950/[0.03] p-4">
              <div className="mb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Budget
                </p>
              </div>

              {isMember ? (
                <BudgetEditor
                  tripId={tripId}
                  budget={trip.budget}
                  budgetCurrency={trip.budget_currency}
                  canManage={canManage}
                  totalSpent={totalsByCurrency[trip.budget_currency] ?? 0}
                  poolSpent={poolSpent}
                  members={members}
                  contributions={contributions}
                  actionSlot={canEdit ? (
                    <AddMoneyDialog
                      tripId={tripId}
                      members={members}
                      currentUserId={currentUserId}
                      places={places}
                      transportBookings={transportBookings}
                      budget={trip.budget}
                      budgetCurrency={trip.budget_currency}
                      canManageBudget={canManage}
                      poolBalance={contributions
                        .filter((c) => c.currency === trip.budget_currency)
                        .reduce((sum, c) => sum + c.amount, 0) - poolSpent}
                      triggerLabel="Add money"
                      triggerClassName="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                    />
                  ) : null}
                />
              ) : (
                <div className="rounded-[1.25rem] bg-white/72 px-4 py-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    Shared money stays private
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    Budget caps, pooled funds, contributors, balances, and transaction history only appear after you join the crew.
                  </p>
                </div>
              )}

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
                      <ExpenseSummaryCard
                        key={expense.id}
                        expense={expense}
                        linkedPlaceName={expense.place_id ? placeNameById[expense.place_id] ?? null : null}
                        linkedTransportName={expense.transport_booking_id ? transportNameById[expense.transport_booking_id] ?? null : null}
                        linkedTransportType={expense.transport_booking_id ? transportTypeById[expense.transport_booking_id] ?? null : null}
                        href={`/trips/${tripId}/expenses/${expense.id}`}
                        compact
                        className={index >= 3 ? 'hidden lg:block' : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TripSectionRefreshBoundary>

          <TripSectionRefreshBoundary
            tripId={tripId}
            sections={TRIP_REFRESH_SECTIONS.crew}
            signature={crewSignature}
            label="Updating crew"
          >
            <div className="overflow-hidden rounded-[1.5rem] bg-stone-950/[0.03] p-4">
            <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  {isMember ? 'Crew' : 'Join this trip'}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                {canManage && <InviteLinkButton tripId={tripId} className="w-full justify-center sm:w-auto" />}
                {isMember && (
                  <Link
                    href={`/trips/${tripId}/members`}
                    className="inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm sm:w-auto"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <UserCog className="h-4 w-4" />
                    Manage
                  </Link>
                )}
              </div>
            </div>

            {isMember ? (
              <CrewCardList
                members={crewWithStats}
                currentUserId={currentUserId}
                currency={balanceCurrency}
              />
            ) : (
              <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                <p>
                  Sign in to vote, comment, add places, manage crew, and unlock shared money for this trip.
                </p>
                <JoinRequestButton
                  tripId={tripId}
                  isAuthenticated={!!user}
                  alreadyRequested={joinRequested}
                />
              </div>
            )}
            </div>
          </TripSectionRefreshBoundary>
        </div>
      </section>

      {isMember && accommodationPlaces.length > 0 && (
        <TripSectionRefreshBoundary
          tripId={tripId}
          sections={TRIP_REFRESH_SECTIONS.places}
          signature={placesSurfaceSignature}
          label="Refreshing stay"
        >
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
            placeExpensesByPlaceId={placeExpensesByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            tripStartDate={trip.start_date}
            tripEndDate={trip.end_date}
          />
        </TripSectionRefreshBoundary>
      )}

      {isMember && (transportBookings.length > 0 ? (
        <TransportSection
          bookings={transportBookings}
          expensesByBookingId={transportExpensesByBookingId}
          tripId={tripId}
          canEdit={canEdit}
        />
      ) : canEdit ? (
        <TransportSectionTrigger tripId={tripId} />
      ) : null)}

      {!isMember && primaryAccommodation && (
        <section className="section-shell mt-4 p-4 sm:p-5">
          <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: '#EA580C' }}>
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Stay
                </p>
                <h2 className="text-lg font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                  Accommodation arranged
                </h2>
              </div>
            </div>
            <div className="rounded-[1.25rem] bg-white/72 px-4 py-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {primaryAccommodation.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Stay details, map shortcuts, and check-in timing stay private to trip members.
              </p>
            </div>
          </div>
        </section>
      )}

      {isMember && (
        <TripSectionRefreshBoundary
          tripId={tripId}
          sections={TRIP_REFRESH_SECTIONS.stops}
          signature={stopsSignature}
          label="Updating trip stops"
        >
          <section className="section-shell mt-4 p-4 sm:p-5">
            <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                    Trip stops
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <StopSpotlightCard
                  label="Previous stop"
                  place={stopPointers.previous}
                  emptyLabel="None yet"
                  tone="previous"
                  canEdit={canEdit}
                  allDayPlaces={stopPointers.previous?.visit_date ? planningPlaces.filter((p) => p.visit_date === stopPointers.previous!.visit_date) : []}
                  allPlaces={planningPlaces}
                  tripId={tripId}
                />
                <StopSpotlightCard
                  label="Current"
                  place={stopPointers.current}
                  emptyLabel={planningScheduledPlaces.length > 0 ? 'No stop today' : 'Not scheduled'}
                  tone="current"
                  canEdit={canEdit}
                  allDayPlaces={stopPointers.current?.visit_date ? planningPlaces.filter((p) => p.visit_date === stopPointers.current!.visit_date) : []}
                  allPlaces={planningPlaces}
                  tripId={tripId}
                />
                <StopSpotlightCard
                  label="Next stop"
                  place={stopPointers.next || null}
                  emptyLabel={planningScheduledPlaces.length > 0 ? 'Nothing ahead' : 'Not scheduled'}
                  tone="next"
                  canEdit={canEdit}
                  allDayPlaces={stopPointers.next?.visit_date ? planningPlaces.filter((p) => p.visit_date === stopPointers.next!.visit_date) : []}
                  allPlaces={planningPlaces}
                  tripId={tripId}
                />
              </div>
            </div>
          </section>
        </TripSectionRefreshBoundary>
      )}

      <TripMobileActionDock
        tripId={tripId}
        canEdit={canEdit}
        members={members}
        currentUserId={currentUserId}
        places={places}
        categories={categories}
        budget={trip.budget}
        budgetCurrency={trip.budget_currency}
        canManageBudget={canManage}
      />

      <TripTabsShell
        tripId={tripId}
        initialActiveTab={activeTab}
        tabs={visibleTabs}
        resolvedRole={resolvedRole}
        canEdit={canEdit}
        canVote={canVote}
        canComment={canComment}
        currentUserId={currentUserId}
        tripStartDate={trip.start_date}
        tripEndDate={trip.end_date}
        places={places}
        categories={categories}
        tags={tags}
        voteSummaries={voteSummaries}
        userVotes={userVotes}
        reviewsByPlaceId={reviewsByPlaceId}
        placeExpensesByPlaceId={placeExpensesByPlaceId}
        commentsByPlaceId={commentsByPlaceId}
        commentAuthors={commentAuthors}
        placesSurfaceSignature={placesSurfaceSignature}
        expensesSignature={expensesSignature}
        activitySignature={activitySignature}
        expenses={expensesWithSplits}
        placeNameById={placeNameById}
        memberProfiles={memberProfiles}
        members={members}
        activityEntries={activityEntries}
      />
    </div>
  );
}
