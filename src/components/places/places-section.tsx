'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Tag, Receipt, X, Sparkles, MapPinned, Clock3 } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, TripRole, PlaceComment } from '@/lib/types';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryForm } from '@/components/categories/add-category-form';
import { AddPlaceForm } from '@/components/places/add-place-form';
import { PlaceGrid } from '@/components/places/place-grid';
import { PlaceSearch } from '@/components/places/place-search';
import { VoteLeaderboard } from '@/components/places/vote-leaderboard';
import { Dialog } from '@/components/ui/dialog';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import type { MemberWithProfile } from '@/features/members/queries';

interface PlacesSectionProps {
  tripId: string;
  role: TripRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialVoteSummaries: VoteSummaryEntry[];
  initialUserVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
  canVote: boolean;
  canComment: boolean;
  members: MemberWithProfile[];
}

const canEdit = (role: TripRole) =>
  ['owner', 'admin', 'editor'].includes(role);

type SortOption = 'newest' | 'most_voted' | 'visit_date' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_voted', label: 'Most voted' },
  { value: 'visit_date', label: 'Visit date' },
  { value: 'name', label: 'Name' },
];

export function PlacesSection({
  tripId,
  role,
  initialPlaces,
  initialCategories,
  initialVoteSummaries,
  initialUserVotes,
  reviewsByPlaceId: initialReviewsByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
  canVote,
  canComment,
  members,
}: PlacesSectionProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [voteSummaries] = useState<VoteSummaryEntry[]>(initialVoteSummaries);
  const [userVotes] = useState<PlaceVote[]>(initialUserVotes);
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState<Record<string, PlaceReview[]>>(initialReviewsByPlaceId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLocationTag, setSelectedLocationTag] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [searchResults, setSearchResults] = useState<Place[] | null>(null);
  const [nextPlaceId, setNextPlaceId] = useState<string | null>(null);

  const editor = canEdit(role);

  // Compute "next stop" based on GMT+7
  useEffect(() => {
    let closest: Place | null = null;
    let closestDiff = Infinity;
    for (const p of places) {
      if (!p.visit_date || !p.visit_time_from) continue;
      const [h, m] = p.visit_time_from.split(':').map(Number);
      const dt = new Date(`${p.visit_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+07:00`).getTime();
      const diff = dt - Date.now();
      if (diff > 0 && diff < closestDiff) {
        closestDiff = diff;
        closest = p;
      }
    }
    setNextPlaceId(closest?.id ?? null);
  }, [places]);

  function handleCategoryCreated(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  function handlePlaceAdded(place: Place, reviews: PlaceReview[]) {
    setPlaces((prev) => [place, ...prev]);
    if (reviews.length > 0) {
      setReviewsByPlaceId((prev) => ({ ...prev, [place.id]: reviews }));
    }
  }

  const basePlaces = searchResults ?? places;
  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const visibleCount = basePlaces.length;
  const scheduledCount = places.filter((place) => place.visit_date).length;
  const topVotedCount = voteSummaries.filter((summary) => summary.upvotes + summary.downvotes > 0).length;
  const nextPlace = nextPlaceId ? places.find((place) => place.id === nextPlaceId) ?? null : null;

  const sortedPlaces = useMemo(() => {
    const list = [...basePlaces];
    switch (sortOption) {
      case 'newest':
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'most_voted':
        return list.sort((a, b) => {
          const aNet = (voteSummaryMap[a.id]?.upvotes ?? 0) - (voteSummaryMap[a.id]?.downvotes ?? 0);
          const bNet = (voteSummaryMap[b.id]?.upvotes ?? 0) - (voteSummaryMap[b.id]?.downvotes ?? 0);
          return bNet - aNet;
        });
      case 'visit_date':
        return list.sort((a, b) => {
          if (!a.visit_date && !b.visit_date) return 0;
          if (!a.visit_date) return 1;
          if (!b.visit_date) return -1;
          return a.visit_date.localeCompare(b.visit_date);
        });
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePlaces, sortOption]);

  return (
    <div className="space-y-5">
      {/* Dialogs */}
      {showAddCategory && editor && (
        <Dialog title="Add category" onClose={() => setShowAddCategory(false)} maxWidth="max-w-sm">
          <AddCategoryForm
            tripId={tripId}
            onCreated={(cat) => { handleCategoryCreated(cat); setShowAddCategory(false); }}
            onCancel={() => setShowAddCategory(false)}
          />
        </Dialog>
      )}

      {showAddPlace && editor && (
        <Dialog title="Add a place" onClose={() => setShowAddPlace(false)} maxWidth="max-w-lg">
          <AddPlaceForm
            tripId={tripId}
            categories={categories}
            onAdded={(place, reviews) => { handlePlaceAdded(place, reviews); setShowAddPlace(false); }}
            onCancel={() => setShowAddPlace(false)}
          />
        </Dialog>
      )}

      <section className="hero-orb relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Collaborative picks
              </p>
              <h2 className="text-2xl font-semibold leading-tight text-white section-title">
                Places, votes, and notes all stay in one planning lane.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/78 sm:text-base">
                Search fast, sort the shortlist, and keep the group moving from ideas to a shared itinerary.
              </p>
            </div>

            {editor && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowAddPlace(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Add place
                </button>

                <button
                  onClick={() => setShowAddCategory(true)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white/14 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/18"
                >
                  <Tag className="h-4 w-4" />
                  Category
                </button>

                <AddExpenseDialog
                  tripId={tripId}
                  members={members}
                  currentUserId={currentUserId}
                  trigger={
                    <button className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white/14 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/18">
                      <Receipt className="h-4 w-4" />
                      Expense
                    </button>
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="metric-tile px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Saved places
              </p>
              <p className="mt-1 text-xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                {places.length}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {visibleCount === places.length ? 'Everything in view' : `${visibleCount} matching filters`}
              </p>
            </div>

            <div className="metric-tile px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                On the plan
              </p>
              <p className="mt-1 text-xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                {scheduledCount}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Places already scheduled
              </p>
            </div>

            <div className="metric-tile px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Vote heat
              </p>
              <p className="mt-1 text-xl font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                {topVotedCount}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Places already have opinions
              </p>
            </div>

            <div className="metric-tile px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Next stop
              </p>
              <p className="mt-1 truncate text-base font-semibold section-title" style={{ color: 'var(--color-text)' }}>
                {nextPlace?.name ?? 'Not set yet'}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {nextPlace?.visit_time_from ? `Starts at ${nextPlace.visit_time_from}` : 'Add a time to spotlight the next stop'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {places.length >= 2 && (
        <VoteLeaderboard places={places} voteSummaries={voteSummaries} categories={categories} />
      )}

      <div className="section-shell p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Filter and focus
            </p>
            <h3 className="mt-1 text-lg font-semibold section-title" style={{ color: 'var(--color-text)' }}>
              Search, sort, and narrow the shortlist
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <span className="mini-stat inline-flex items-center gap-2 px-3 py-2">
              <MapPinned className="h-4 w-4" />
              {visibleCount} visible
            </span>
            <span className="mini-stat inline-flex items-center gap-2 px-3 py-2">
              <Clock3 className="h-4 w-4" />
              {scheduledCount} scheduled
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {places.length > 0 && (
            <PlaceSearch
              places={places}
              onResults={(filtered) =>
                setSearchResults(filtered.length === places.length ? null : filtered)
              }
            />
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {places.length > 1 && (
              <div className="flex items-center gap-2">
                <label htmlFor="sort-places" className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                  Sort by
                </label>
                <select
                  id="sort-places"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedLocationTag && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Location filter</span>
                <button
                  onClick={() => setSelectedLocationTag(null)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
                >
                  {selectedLocationTag}
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <CategoryList categories={categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
          )}
        </div>
      </div>

      <PlaceGrid
        places={sortedPlaces}
        categories={categories}
        tripId={tripId}
        selectedCategoryId={selectedCategoryId}
        selectedLocationTag={selectedLocationTag}
        onLocationTagClick={(tag) =>
          setSelectedLocationTag((prev) => (prev === tag ? null : tag))
        }
        voteSummaries={voteSummaries}
        userVotes={userVotes}
        reviewsByPlaceId={reviewsByPlaceId}
        nextPlaceId={nextPlaceId}
        commentsByPlaceId={commentsByPlaceId}
        commentAuthors={commentAuthors}
        currentUserId={currentUserId}
        canVote={canVote}
        canComment={canComment}
        canEdit={editor}
        onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
      />
    </div>
  );
}
