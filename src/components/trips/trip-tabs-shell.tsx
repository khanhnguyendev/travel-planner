'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Calendar, Coins, Globe, Loader2, MapPin, Receipt } from 'lucide-react';
import { PlacesSection } from '@/components/places/places-section';
import { TripTimeline } from '@/components/places/trip-timeline';
import { MapTabClient } from '@/components/places/map-tab-client';
import { DebtSummary, type DebtSummaryMember } from '@/components/expenses/debt-summary';
import { ExpenseSummaryCard } from '@/components/expenses/expense-summary-card';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { TripSectionRefreshBoundary } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import type { ActivityEntry } from '@/features/activity/queries';
import type { MemberWithProfile } from '@/features/members/queries';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import type {
  Category,
  Place,
  PlaceComment,
  PlaceExpenseHistoryEntry,
  PlaceReview,
  PlaceVote,
  TripRole,
} from '@/lib/types';

export type TripTabValue = 'places' | 'timeline' | 'map' | 'expenses' | 'activity';

const TAB_ITEMS: Array<{ label: string; value: TripTabValue; icon: React.ReactNode }> = [
  { label: 'Places', value: 'places', icon: <MapPin className="h-3.5 w-3.5" /> },
  { label: 'Plan', value: 'timeline', icon: <Calendar className="h-3.5 w-3.5" /> },
  { label: 'Map', value: 'map', icon: <Globe className="h-3.5 w-3.5" /> },
  { label: 'Money', value: 'expenses', icon: <Coins className="h-3.5 w-3.5" /> },
  { label: 'Activity', value: 'activity', icon: <Activity className="h-3.5 w-3.5" /> },
];

function resolveTabFromUrl(tabs: TripTabValue[], fallback: TripTabValue) {
  if (typeof window === 'undefined') return fallback;
  const value = new URLSearchParams(window.location.search).get('tab');
  return value && tabs.includes(value as TripTabValue) ? (value as TripTabValue) : fallback;
}

function setTabUrl(nextTab: TripTabValue) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', nextTab);
  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.pushState({ tab: nextTab }, '', nextUrl);
}

interface TripTabsShellProps {
  tripId: string;
  initialActiveTab: TripTabValue;
  tabs: TripTabValue[];
  resolvedRole: TripRole;
  canEdit: boolean;
  canVote: boolean;
  canComment: boolean;
  currentUserId: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  places: Place[];
  categories: Category[];
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  placesSurfaceSignature: string;
  expensesSignature: string;
  activitySignature: string;
  expenses: ExpenseWithSplits[];
  placeNameById: Record<string, string>;
  memberProfiles: DebtSummaryMember[];
  members: MemberWithProfile[];
  activityEntries: ActivityEntry[];
}

export function TripTabsShell({
  tripId,
  initialActiveTab,
  tabs,
  resolvedRole,
  canEdit,
  canVote,
  canComment,
  currentUserId,
  tripStartDate,
  tripEndDate,
  places,
  categories,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  placeExpensesByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  placesSurfaceSignature,
  expensesSignature,
  activitySignature,
  expenses,
  placeNameById,
  memberProfiles,
  members,
  activityEntries,
}: TripTabsShellProps) {
  const [activeTab, setActiveTab] = useState<TripTabValue>(initialActiveTab);
  const deferredActiveTab = useDeferredValue(activeTab);
  const isSwitching = deferredActiveTab !== activeTab;

  const activeTabLabel = useMemo(
    () => TAB_ITEMS.find((tab) => tab.value === activeTab)?.label ?? 'Tab',
    [activeTab]
  );

  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  useEffect(() => {
    function handlePopState() {
      setActiveTab(resolveTabFromUrl(tabs, initialActiveTab));
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [initialActiveTab, tabs]);

  function handleTabSelect(nextTab: TripTabValue) {
    if (nextTab === activeTab) return;
    setActiveTab(nextTab);
    setTabUrl(nextTab);
  }

  return (
    <>
      <div className="sticky-tabs mt-4 mb-5">
        <div className="section-shell overflow-x-auto p-1.5 scrollbar-hide sm:p-2">
          <div className="flex min-w-max items-center gap-1.5 sm:gap-2" role="tablist" aria-label="Trip sections">
            {TAB_ITEMS
              .filter((tab) => tabs.includes(tab.value))
              .map((tab) => {
                const isActive = tab.value === activeTab;
                const showLoading = isActive && isSwitching;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabSelect(tab.value)}
                    className={`pill-tab flex min-h-[40px] items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all sm:min-h-[44px] sm:gap-2 sm:px-4 sm:text-sm ${isActive ? 'pill-tab-active' : ''}`}
                    style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
                  >
                    {showLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tab.icon}
                    {tab.label}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <div className="relative min-h-[220px]">
        {isSwitching && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold shadow-sm" style={{ color: 'var(--color-text)' }}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading {activeTabLabel.toLowerCase()}
            </div>
          </div>
        )}

        <div className={`transition-opacity duration-150 ${isSwitching ? 'opacity-75' : 'opacity-100'}`}>
          {deferredActiveTab === 'places' && (
            <div className="mb-6">
              <TripSectionRefreshBoundary
                tripId={tripId}
                sections={TRIP_REFRESH_SECTIONS.places}
                signature={placesSurfaceSignature}
                label="Refreshing places"
              >
                <PlacesSection
                  tripId={tripId}
                  role={resolvedRole}
                  initialPlaces={places}
                  initialCategories={categories}
                  initialVoteSummaries={voteSummaries}
                  initialUserVotes={userVotes}
                  reviewsByPlaceId={reviewsByPlaceId}
                  placeExpensesByPlaceId={placeExpensesByPlaceId}
                  commentsByPlaceId={commentsByPlaceId}
                  commentAuthors={commentAuthors}
                  currentUserId={currentUserId}
                  canVote={canVote}
                  canComment={canComment}
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                />
              </TripSectionRefreshBoundary>
            </div>
          )}

          {deferredActiveTab === 'timeline' && (
            <TripSectionRefreshBoundary
              tripId={tripId}
              sections={TRIP_REFRESH_SECTIONS.timeline}
              signature={placesSurfaceSignature}
              label="Refreshing timeline"
            >
              <div className="section-shell mb-5 overflow-hidden p-4 sm:p-6">
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
                  placeExpensesByPlaceId={placeExpensesByPlaceId}
                  commentsByPlaceId={commentsByPlaceId}
                  commentAuthors={commentAuthors}
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                />
              </div>
            </TripSectionRefreshBoundary>
          )}

          {deferredActiveTab === 'map' && (
            <TripSectionRefreshBoundary
              tripId={tripId}
              sections={TRIP_REFRESH_SECTIONS.map}
              signature={placesSurfaceSignature}
              label="Refreshing map"
            >
              <div className="section-shell mb-5 overflow-hidden p-3 sm:p-4">
                <MapTabClient
                  tripId={tripId}
                  places={places}
                  categories={categories}
                  canVote={canVote}
                  canComment={canComment}
                  voteSummaries={voteSummaries}
                  userVotes={userVotes}
                  reviewsByPlaceId={reviewsByPlaceId}
                  placeExpensesByPlaceId={placeExpensesByPlaceId}
                  commentsByPlaceId={commentsByPlaceId}
                  commentAuthors={commentAuthors}
                  currentUserId={currentUserId}
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                />
              </div>
            </TripSectionRefreshBoundary>
          )}

          {deferredActiveTab === 'expenses' && (
            <TripSectionRefreshBoundary
              tripId={tripId}
              sections={TRIP_REFRESH_SECTIONS.expenses}
              signature={expensesSignature}
              label="Updating money"
            >
              <div className="mb-5 space-y-3 sm:space-y-4">
                {expenses.length > 0 && (
                  <DebtSummary
                    expenses={expenses}
                    members={memberProfiles}
                    currentUserId={currentUserId}
                  />
                )}

                <div className="section-shell overflow-hidden p-4 sm:p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                        Money
                      </p>
                      <h2 className="mt-1 text-lg font-semibold section-title sm:text-xl" style={{ color: 'var(--color-text)' }}>
                        Shared expenses
                      </h2>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {expenses.length > 0
                          ? `${expenses.length} expense entries with payer, split crew, place, and time details`
                          : 'No expenses added yet'}
                      </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                      {canEdit && (
                        <AddExpenseDialog
                          tripId={tripId}
                          members={members}
                          currentUserId={currentUserId}
                          places={places}
                          triggerClassName="w-full justify-center sm:w-auto"
                        />
                      )}
                      <Link href={`/trips/${tripId}/expenses`} className="btn-secondary min-h-[44px] w-full justify-center text-sm sm:w-auto">
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
                        <ExpenseSummaryCard
                          key={expense.id}
                          expense={expense}
                          linkedPlaceName={expense.place_id ? placeNameById[expense.place_id] ?? null : null}
                          href={`/trips/${tripId}/expenses/${expense.id}`}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TripSectionRefreshBoundary>
          )}

          {deferredActiveTab === 'activity' && (
            <TripSectionRefreshBoundary
              tripId={tripId}
              sections={TRIP_REFRESH_SECTIONS.activity}
              signature={activitySignature}
              label="Refreshing activity"
            >
              <div className="mb-5">
                <ActivityFeed activities={activityEntries} />
              </div>
            </TripSectionRefreshBoundary>
          )}
        </div>
      </div>
    </>
  );
}
