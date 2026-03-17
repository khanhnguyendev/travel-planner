'use client';

import { useState, useMemo } from 'react';
import { Plus, Settings2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, ProjectRole } from '@/lib/types';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryForm } from '@/components/categories/add-category-form';
import { AddPlaceForm } from '@/components/places/add-place-form';
import { PlaceGrid } from '@/components/places/place-grid';
import { PlaceSearch } from '@/components/places/place-search';
import { VoteLeaderboard } from '@/components/places/vote-leaderboard';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlacesSectionProps {
  projectId: string;
  role: ProjectRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialVoteSummaries: VoteSummaryEntry[];
  initialUserVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
}

const canEdit = (role: ProjectRole) =>
  ['owner', 'admin', 'editor'].includes(role);

type SortOption = 'newest' | 'most_voted' | 'visit_date' | 'name';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_voted', label: 'Most voted' },
  { value: 'visit_date', label: 'Visit date' },
  { value: 'name', label: 'Name' },
];

export function PlacesSection({
  projectId,
  role,
  initialPlaces,
  initialCategories,
  initialVoteSummaries,
  initialUserVotes,
  reviewsByPlaceId: initialReviewsByPlaceId,
}: PlacesSectionProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [voteSummaries] = useState<VoteSummaryEntry[]>(initialVoteSummaries);
  const [userVotes] = useState<PlaceVote[]>(initialUserVotes);
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState<
    Record<string, PlaceReview[]>
  >(initialReviewsByPlaceId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [searchResults, setSearchResults] = useState<Place[] | null>(null);

  const editor = canEdit(role);

  function handleCategoryCreated(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  function handlePlaceAdded(place: Place, reviews: PlaceReview[]) {
    setPlaces((prev) => [place, ...prev]);
    if (reviews.length > 0) {
      setReviewsByPlaceId((prev) => ({ ...prev, [place.id]: reviews }));
    }
    setShowAddPlace(false);
  }

  // The base list is either search results or all places
  const basePlaces = searchResults ?? places;

  // Build a vote summary map for sorting
  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));

  // Sort the base places
  const sortedPlaces = useMemo(() => {
    const list = [...basePlaces];
    switch (sortOption) {
      case 'newest':
        return list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'most_voted': {
        return list.sort((a, b) => {
          const aVotes = voteSummaryMap[a.id];
          const bVotes = voteSummaryMap[b.id];
          const aNet = aVotes ? aVotes.upvotes - aVotes.downvotes : 0;
          const bNet = bVotes ? bVotes.upvotes - bVotes.downvotes : 0;
          return bNet - aNet;
        });
      }
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
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-stone-800">
          Places
          {places.length > 0 && (
            <span className="ml-2 text-sm font-normal text-stone-400">
              ({places.length})
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {editor && (
            <>
              <button
                onClick={() => setShowManageCategories((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors min-h-[44px]"
                style={{
                  backgroundColor: showManageCategories
                    ? 'var(--color-bg-muted)'
                    : 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Categories</span>
                {showManageCategories ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => setShowAddPlace((v) => !v)}
                className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                Add place
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manage categories panel */}
      {showManageCategories && editor && (
        <div
          className="card p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 text-stone-800">
            Manage categories
          </h3>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <Tag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-sm font-medium text-stone-800 mb-1">
                Create a category to organize places
              </p>
              <p className="text-xs text-stone-400 mb-4">
                Categories help group places by type like restaurants, hotels, or attractions.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    backgroundColor: cat.color ?? 'var(--color-bg-subtle)',
                    color: '#1C1917',
                  }}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          )}

          <AddCategoryForm
            projectId={projectId}
            onCreated={handleCategoryCreated}
          />
        </div>
      )}

      {/* Add place form */}
      {showAddPlace && editor && (
        <div
          className="card p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-semibold mb-4 text-stone-800">
            Add a place
          </h3>
          <AddPlaceForm
            projectId={projectId}
            categories={categories}
            onAdded={handlePlaceAdded}
            onCancel={() => setShowAddPlace(false)}
          />
        </div>
      )}

      {/* Main content: grid + leaderboard sidebar */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: search + sort + category filter + grid */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search */}
          {places.length > 0 && (
            <PlaceSearch
              places={places}
              onResults={(filtered) =>
                setSearchResults(filtered.length === places.length ? null : filtered)
              }
            />
          )}

          {/* Sort dropdown */}
          {places.length > 1 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-places"
                className="text-xs font-medium flex-shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Sort by
              </label>
              <select
                id="sort-places"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="rounded-xl border px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                  color: 'var(--color-text)',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category filter */}
          {categories.length > 0 && (
            <CategoryList
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          )}

          {/* Place grid */}
          <PlaceGrid
            places={sortedPlaces}
            categories={categories}
            projectId={projectId}
            selectedCategoryId={selectedCategoryId}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
          />
        </div>

        {/* Right: vote leaderboard sidebar */}
        {places.length >= 2 && (
          <div className="lg:w-72 flex-shrink-0">
            <VoteLeaderboard
              places={places}
              voteSummaries={voteSummaries}
              categories={categories}
            />
          </div>
        )}
      </div>
    </div>
  );
}
