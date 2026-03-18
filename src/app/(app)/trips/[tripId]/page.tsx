import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Users,
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
  BedDouble,
  Sparkles,
  Coins,
  Clock3,
} from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces, getCommentsByTripId } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpenses, getExpensesWithSplits } from '@/features/expenses/queries';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { PlacesSection } from '@/components/places/places-section';
import { TripTimeline } from '@/components/places/trip-timeline';
import { MapTabClient } from '@/components/places/map-tab-client';
import { DebtSummary } from '@/components/expenses/debt-summary';
import { Avatar } from '@/components/ui/avatar';
import { CoverImageUpload } from '@/components/trips/cover-image-upload';
import { BudgetEditor } from '@/components/trips/budget-editor';
import { MemberBalances } from '@/components/trips/member-balances';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { AccommodationSection } from '@/components/places/accommodation-section';
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

function getTopPick(places: Place[], summaries: Array<{ placeId: string; upvotes: number; downvotes: number }>) {
  const summaryMap = new Map(summaries.map((entry) => [entry.placeId, entry]));
  return [...places]
    .map((place) => {
      const summary = summaryMap.get(place.id);
      return {
        place,
        score: (summary?.upvotes ?? 0) - (summary?.downvotes ?? 0),
        activity: (summary?.upvotes ?? 0) + (summary?.downvotes ?? 0),
      };
    })
    .filter((entry) => entry.activity > 0)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function getNextStop(places: Place[]) {
  return [...places]
    .filter((place) => place.visit_date)
    .sort((a, b) => {
      const aValue = `${a.visit_date ?? ''}-${a.visit_time_from ?? '99:99'}`;
      const bValue = `${b.visit_date ?? ''}-${b.visit_time_from ?? '99:99'}`;
      return aValue.localeCompare(bValue);
    })[0] ?? null;
}

function SnapshotPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="mini-stat flex min-w-[172px] items-center gap-3 px-3 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug section-title" style={{ color: 'var(--color-text)' }}>
          {value}
        </p>
      </div>
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
    <div className="sticky-tabs mb-5">
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
  const topPick = getTopPick(places, voteSummaries);
  const nextStop = getNextStop(places);
  const accommodationCategoryIds = new Set(
    categories.filter((category) => category.category_type === 'accommodation').map((category) => category.id)
  );
  const accommodationPlaces = places.filter((place) => accommodationCategoryIds.has(place.category_id));
  const scheduledPlaces = places.filter((place) => place.visit_date);
  const totalsByCurrency: Record<string, number> = {};
  for (const expense of expenses) {
    totalsByCurrency[expense.currency] = (totalsByCurrency[expense.currency] ?? 0) + expense.amount;
  }
  const spendSummary = Object.entries(totalsByCurrency).length > 0
    ? Object.entries(totalsByCurrency).map(([currency, amount]) => formatCurrency(amount, currency)).join(' + ')
    : 'No expenses yet';
  const memberPreview = members.slice(0, 4);
  const remainingMembers = Math.max(0, members.length - memberPreview.length);
  const showCoverMedia = canManage || Boolean(trip.cover_image_url);

  return (
    <div className="animate-in fade-in duration-300">
      <section className="section-shell p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_280px] lg:items-start">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
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

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                  Trip overview
                </p>
                <h1 className="mt-1 text-3xl font-semibold leading-tight section-title sm:text-[2.25rem]" style={{ color: 'var(--color-text)' }}>
                  {trip.title}
                </h1>
                {trip.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-text-muted)' }}>
                    {trip.description}
                  </p>
                )}
              </div>

              {!isMember && (
                <div className="max-w-xl rounded-[1.2rem] border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>
                      This is a public trip preview. Places, map, and timeline stay visible here, while invites, comments, votes, and spending remain member-only.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {canManage && <InviteLinkButton tripId={tripId} />}
                {canEdit && <AddExpenseDialog tripId={tripId} members={members} currentUserId={currentUserId} />}
                {isMember && (
                  <Link href={`/trips/${tripId}/members`} className="btn-secondary min-h-[40px] text-sm">
                    <span className="inline-flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      Crew
                    </span>
                  </Link>
                )}
              </div>
            </div>

            {showCoverMedia ? (
              <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-3">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                      Cover
                    </p>
                    <h2 className="mt-1 text-sm font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                      Trip media
                    </h2>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[1.25rem]">
                  {canManage ? (
                    <CoverImageUpload tripId={tripId} currentCoverUrl={trip.cover_image_url} height={156} />
                  ) : trip.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trip.cover_image_url}
                      alt={`${trip.title} cover`}
                      className="h-[156px] w-full object-cover"
                    />
                  ) : (
                    <div className="hero-orb h-[156px] w-full" />
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <SnapshotPill
              label="Dates"
              value={trip.start_date && trip.end_date ? formatDateRange(trip.start_date, trip.end_date) : 'Flexible'}
              icon={<Calendar className="h-4 w-4" />}
            />
            <SnapshotPill
              label="Crew"
              value={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
              icon={<Users className="h-4 w-4" />}
            />
            <SnapshotPill
              label="Places"
              value={`${places.length} saved · ${scheduledPlaces.length} scheduled`}
              icon={<MapPin className="h-4 w-4" />}
            />
            <SnapshotPill
              label="Money"
              value={expenses.length > 0 ? spendSummary : 'No spending yet'}
              icon={<Receipt className="h-4 w-4" />}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="mini-stat inline-flex items-center gap-2 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Top pick:</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {topPick ? `${topPick.place.name} (${topPick.score > 0 ? '+' : ''}${topPick.score})` : 'No votes yet'}
              </span>
            </span>
            <span className="mini-stat inline-flex items-center gap-2 px-3 py-2 text-sm">
              <Clock3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Next stop:</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {nextStop ? nextStop.name : 'Not scheduled'}
              </span>
            </span>
            <span className="mini-stat inline-flex items-center gap-2 px-3 py-2 text-sm">
              <BedDouble className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-text-muted)' }}>Stay:</span>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {accommodationPlaces[0]?.name ?? 'Not set'}
              </span>
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
            <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Budget
              </p>
              <BudgetEditor
                tripId={tripId}
                budget={trip.budget}
                budgetCurrency={trip.budget_currency}
                budgetPayerUserId={trip.budget_payer_user_id}
                canManage={canManage}
                totalSpent={totalsByCurrency[trip.budget_currency] ?? 0}
                members={members}
              />
            </div>

            <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                    Crew
                  </p>
                  <h3 className="mt-1 text-base font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                    Shared visibility
                  </h3>
                </div>
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

              {isMember ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.2rem] bg-white/70 px-3 py-3">
                    <div className="flex items-center -space-x-2">
                      {memberPreview.map((member) => {
                        const name = member.profile.display_name ?? 'Unknown';
                        return (
                          <div key={member.id} className="rounded-full border-2 border-white">
                            <Avatar user={{ display_name: name, avatar_url: member.profile.avatar_url }} size="sm" />
                          </div>
                        );
                      })}
                      {remainingMembers > 0 && (
                        <span className="ml-1 inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-stone-600 shadow-sm">
                          +{remainingMembers}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {members.length} members
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Roles and invite links live in Crew
                      </p>
                    </div>
                  </div>

                  <MemberBalances
                    expenses={expensesWithSplits}
                    members={members}
                    currentUserId={currentUserId}
                    budgetAmount={trip.budget}
                    budgetCurrency={trip.budget_currency}
                    budgetPayerUserId={trip.budget_payer_user_id}
                  />
                </>
              ) : (
                <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Join the trip to vote, comment, add places, manage crew, and track shared spending.
                </div>
              )}
            </div>
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
            members={members}
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
