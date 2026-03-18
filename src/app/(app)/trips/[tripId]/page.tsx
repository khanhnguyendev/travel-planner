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
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces, getCommentsByProjectId } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpenses, getExpensesWithSplits } from '@/features/expenses/queries';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PlacesSection } from '@/components/places/places-section';
import { TripTimeline } from '@/components/places/trip-timeline';
import { MapTabClient } from '@/components/places/map-tab-client';
import { DebtSummary } from '@/components/expenses/debt-summary';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { CoverImageUpload } from '@/components/trips/cover-image-upload';
import { BudgetEditor } from '@/components/trips/budget-editor';
import { MemberBalances } from '@/components/trips/member-balances';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { AccommodationSection } from '@/components/places/accommodation-section';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { getTripActivity } from '@/features/activity/queries';
import type { TripRole, Visibility, PlaceVote, PlaceReview, PlaceComment } from '@/lib/types';
import type { Metadata } from 'next';

// -------------------------------------------------------
// Metadata
// -------------------------------------------------------

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

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function RoleBadge({ role }: { role: TripRole }) {
  const styles: Record<TripRole, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    owner:  { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200/30', icon: <Crown className="w-3 h-3" /> },
    admin:  { bg: 'bg-indigo-500/10', text: 'text-indigo-700', border: 'border-indigo-200/30', icon: <ShieldCheck className="w-3 h-3" /> },
    editor: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200/30', icon: <Pencil className="w-3 h-3" /> },
    viewer: { bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200/30', icon: <Eye className="w-3 h-3" /> },
  };
  const s = styles[role];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest backdrop-blur-md border animate-in fade-in zoom-in-95 duration-500 shadow-sm",
      s.bg, s.text, s.border
    )}>
      {s.icon}
      {role}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === 'public';
  return (
    <span className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest backdrop-blur-md transition-all border animate-in fade-in zoom-in-95 duration-500 delay-75 shadow-sm",
      isPublic ? "bg-blue-500/10 text-blue-600 border-blue-200/30" : "bg-slate-500/10 text-slate-500 border-slate-200/30"
    )}>
      {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      {isPublic ? 'Public' : 'Private Access'}
    </span>
  );
}

type TabValue = 'places' | 'timeline' | 'map' | 'expenses' | 'activity';

function TabBar({
  activeTab,
  tripId,
}: {
  activeTab: TabValue;
  tripId: string;
}) {
  const tabs = [
    { label: 'Places', value: 'places', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Timeline', value: 'timeline', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Map', value: 'map', icon: <Globe className="w-4 h-4" /> },
    { label: 'Expenses', value: 'expenses', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Activity', value: 'activity', icon: <MessageCircle className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-[2rem] mb-10 glass-nav border-white/40 shadow-premium sticky top-[80px] z-30 animate-in fade-in slide-in-from-top-4 duration-700">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={`/trips/${tripId}?tab=${tab.value}`}
            className={cn(
              "flex-1 text-center px-2 py-3 rounded-[1.5rem] transition-all duration-300 min-h-[48px] flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 group",
              isActive 
                ? "bg-primary text-white shadow-premium scale-[1.02]" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/60"
            )}
          >
            <span className={cn("transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-115")}>
              {tab.icon}
            </span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest hidden xs:block">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tripId } = await params;
  const { tab: tabParam } = await searchParams;
  const user = await requireSession();

  const validTabs: TabValue[] = ['places', 'timeline', 'map', 'expenses', 'activity'];
  const activeTab: TabValue =
    tabParam && validTabs.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : 'places';

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

  // Non-members can view public projects in viewer mode
  const effectiveRole: TripRole | null =
    role ?? (trip.visibility === 'public' ? 'viewer' : null);
  if (!effectiveRole) {
    notFound();
  }
  // From here effectiveRole is guaranteed non-null
  const resolvedRole = effectiveRole as TripRole;

  // Fetch places (needed for Places + Timeline + Map tabs)
  const places = await getPlaces(tripId);

  const [voteSummaries, userVotesRaw, reviewsRaw, commentsRaw, expensesWithSplits, activityEntries] =
    await Promise.all([
      getVoteSummary(tripId),
      Promise.all(places.map((p) => getUserVote(p.id, user.id))),
      (async () => {
        if (places.length === 0) return [];
        const supabase = await createClient();
        const { data } = await supabase
          .from('place_reviews')
          .select('*')
          .in(
            'place_id',
            places.map((p) => p.id)
          );
        return data ?? [];
      })(),
      getCommentsByProjectId(tripId),
      getExpensesWithSplits(tripId),
      getTripActivity(tripId),
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
  for (const m of members) {
    commentAuthors[m.user_id] = m.profile.display_name ?? 'Member';
  }

  const isArchived = trip.status === 'archived';
  const canEdit = ['owner', 'admin', 'editor'].includes(resolvedRole);
  const canManage = ['owner', 'admin'].includes(resolvedRole);

  const memberProfiles = members.map((m) => ({
    id: m.profile.id,
    display_name: m.profile.display_name,
    avatar_url: m.profile.avatar_url,
    user_id: m.user_id,
  }));

  return (
    <div className="animate-in fade-in duration-300">
      {/* Cover image strip */}
      {canManage ? (
        <div className="mb-6 rounded-2xl overflow-hidden">
          <CoverImageUpload tripId={tripId} currentCoverUrl={trip.cover_image_url} />
        </div>
      ) : trip.cover_image_url ? (
        <div className="mb-6 rounded-2xl overflow-hidden h-32 sm:h-48 md:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.cover_image_url}
            alt={`${trip.title} cover`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <PageHeader
        title={trip.title}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: trip.title }]}
      />

      {/* Unified trip header card */}
      <div className="card-premium p-8 mb-8 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        
        {/* Title and Role row */}
        <div className="flex items-start justify-between gap-6 mb-6 relative z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <RoleBadge role={resolvedRole} />
              {isArchived && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-200/20 backdrop-blur-md">
                  Archived
                </span>
              )}
            </div>
            {trip.description && (
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                {trip.description}
              </p>
            )}
          </div>
        </div>

        {/* Meta pills */}
        <div className="flex items-center gap-6 flex-wrap mb-8 relative z-10">
          {trip.start_date && trip.end_date && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-slate-100 shadow-sm transition-all hover:shadow-md">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <VisibilityBadge visibility={trip.visibility} />
        </div>

        {/* Budget */}
        {(() => {
          const totals: Record<string, number> = {};
          for (const exp of expenses) {
            totals[exp.currency] = (totals[exp.currency] ?? 0) + exp.amount;
          }
          const totalSpentInBudgetCurrency = totals[trip.budget_currency] ?? 0;
          return (
            <BudgetEditor
              tripId={tripId}
              budget={trip.budget}
              budgetCurrency={trip.budget_currency}
              budgetPayerUserId={trip.budget_payer_user_id}
              canManage={canManage}
              totalSpent={totalSpentInBudgetCurrency}
              members={members}
            />
          );
        })()}

        {/* Divider */}
        <div
          className="my-5 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        />

        {/* Members Section */}
        <div className="flex items-center justify-between gap-4 mb-5 relative z-10">
          <h2 className="text-[10px] font-black font-display uppercase tracking-[0.2em] text-muted-foreground/60">
            Travel Companions
          </h2>
          <div className="flex items-center gap-3">
            {canManage && (
              <InviteLinkButton tripId={tripId} />
            )}
            <Link
              href={`/trips/${tripId}/members`}
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors py-2 px-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100"
            >
              <UserCog className="w-4 h-4" />
              Manage
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap mb-6 relative z-10">
          {members.map((m) => {
            const name = m.profile.display_name ?? 'Unknown';
            const isCurrentUser = m.user_id === user.id;
            const roleConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
              owner:  { icon: <Crown className="w-3 h-3" />,       bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200/30' },
              admin:  { icon: <ShieldCheck className="w-3 h-3" />, bg: 'bg-indigo-500/10', text: 'text-indigo-700', border: 'border-indigo-200/30' },
              editor: { icon: <Pencil className="w-3 h-3" />,      bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200/30' },
              viewer: { icon: <Eye className="w-3 h-3" />,         bg: 'bg-slate-500/10', text: 'text-slate-600', border: 'border-slate-200/30' },
            };
            const rc = roleConfig[m.role] ?? roleConfig.viewer;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all hover:shadow-soft",
                  rc.bg, rc.text, rc.border
                )}
                title={`${name} — ${m.role}${isCurrentUser ? ' (you)' : ''}`}
              >
                <Avatar user={{ display_name: name, avatar_url: m.profile.avatar_url }} size="sm" className="ring-2 ring-white" />
                <span className="tracking-wide">{name}{isCurrentUser ? ' (you)' : ''}</span>
                <span className="flex items-center gap-1 opacity-60 bg-white/40 px-1.5 py-0.5 rounded-full">{rc.icon}{m.role}</span>
              </div>
            );
          })}
        </div>

        {/* Member balances */}
        <MemberBalances
          expenses={expensesWithSplits}
          members={members}
          currentUserId={user.id}
          budgetAmount={trip.budget}
          budgetCurrency={trip.budget_currency}
          budgetPayerUserId={trip.budget_payer_user_id}
        />
      </div>

      {/* Accommodation — always visible above tabs */}
      <AccommodationSection
        places={places}
        categories={categories}
        tripId={tripId}
        currentUserId={user.id}
        canEdit={canEdit}
        voteSummaries={voteSummaries}
        userVotes={userVotes}
        reviewsByPlaceId={reviewsByPlaceId}
        commentsByPlaceId={commentsByPlaceId}
        commentAuthors={commentAuthors}
      />

      {/* Tab bar */}
      <TabBar activeTab={activeTab} tripId={tripId} />

      {/* Tab: Places */}
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
            currentUserId={user.id}
            members={members}
          />
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="card-premium p-6 mb-8 group overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
          <TripTimeline
            places={places}
            categories={categories}
            tripId={tripId}
            currentUserId={user.id}
            canEdit={canEdit}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
          />
        </div>
      )}

      {/* Tab: Map */}
      {activeTab === 'map' && (
        <div className="mb-6">
          <MapTabClient
            tripId={tripId}
            places={places}
            categories={categories}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={user.id}
          />
        </div>
      )}

      {/* Tab: Expenses */}
      {activeTab === 'expenses' && (
        <div className="mb-6">
          {expensesWithSplits.length > 0 && (
            <DebtSummary
              expenses={expensesWithSplits}
              members={memberProfiles}
              currentUserId={user.id}
            />
          )}

          {(() => {
            const totals: Record<string, number> = {};
            for (const exp of expenses) {
              totals[exp.currency] = (totals[exp.currency] ?? 0) + exp.amount;
            }
            const totalEntries = Object.entries(totals);

            return (
              <div className="card-premium p-8 group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-secondary/10 transition-colors pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm flex items-center justify-center transition-transform group-hover:rotate-3">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl text-foreground tracking-tight">
                        Trip Expenses
                      </h2>
                      {expenses.length > 0 && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mt-1">
                          {expenses.length} {expenses.length === 1 ? 'Entry' : 'Entries'} &middot; {totalEntries.map(([cur, amt]) => formatCurrency(amt, cur)).join(' + ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {canEdit && (
                      <div className="flex-1 sm:flex-none">
                        <AddExpenseDialog
                          tripId={tripId}
                          members={members}
                          currentUserId={user.id}
                        />
                      </div>
                    )}
                    <Link
                      href={`/trips/${tripId}/expenses`}
                      className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-2xl border border-slate-200 bg-white text-slate-500 font-display font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                    >
                      View All
                    </Link>
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
                      <Receipt className="w-8 h-8" />
                    </div>
                    <p className="font-display font-bold text-lg text-slate-800 mb-1">
                      Track Shared Expenses
                    </p>
                    <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                      Keep everyone on the same page by logging receipts and splitting costs fairly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 relative z-10">
                    {expenses.slice(0, 3).map((exp) => (
                      <Link
                        key={exp.id}
                        href={`/trips/${tripId}/expenses/${exp.id}`}
                        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-100 transition-all hover:border-primary/20 hover:shadow-soft group/item"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 truncate group-hover/item:text-slate-900">
                            {exp.title}
                          </span>
                        </div>
                        <span className="text-sm font-display font-bold text-primary">
                          {formatCurrency(exp.amount, exp.currency)}
                        </span>
                      </Link>
                    ))}
                    {expenses.length > 3 && (
                      <div className="pt-2 pl-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          +{expenses.length - 3} additional {expenses.length - 3 === 1 ? 'record' : 'records'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <div className="mb-6">
          <ActivityFeed activities={activityEntries} />
        </div>
      )}
    </div>
  );
}
