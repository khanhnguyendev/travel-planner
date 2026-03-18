'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, Tag } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, ProjectRole, PlaceComment } from '@/lib/types';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryForm } from '@/components/categories/add-category-form';
import { AddPlaceForm } from '@/components/places/add-place-form';
import { PlaceGrid } from '@/components/places/place-grid';
import { PlaceSearch } from '@/components/places/place-search';
import { VoteLeaderboard } from '@/components/places/vote-leaderboard';
import { Dialog } from '@/components/ui/dialog';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlacesSectionProps {
  projectId: string;
  role: ProjectRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialVoteSummaries: VoteSummaryEntry[];
  initialUserVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
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
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
}: PlacesSectionProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [voteSummaries] = useState<VoteSummaryEntry[]>(initialVoteSummaries);
  const [userVotes] = useState<PlaceVote[]>(initialUserVotes);
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState<Record<string, PlaceReview[]>>(initialReviewsByPlaceId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
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
            projectId={projectId}
            onCreated={(cat) => { handleCategoryCreated(cat); setShowAddCategory(false); }}
            onCancel={() => setShowAddCategory(false)}
          />
        </Dialog>
      )}

      {showAddPlace && editor && (
        <Dialog title="Add a place" onClose={() => setShowAddPlace(false)} maxWidth="max-w-lg">
          <AddPlaceForm
            projectId={projectId}
            categories={categories}
            onAdded={(place, reviews) => { handlePlaceAdded(place, reviews); setShowAddPlace(false); }}
            onCancel={() => setShowAddPlace(false)}
          />
        </Dialog>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-stone-800">
          Places
          {places.length > 0 && (
            <span className="ml-2 text-sm font-normal text-stone-400">({places.length})</span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {editor && (
            <>
              <button
                onClick={() => setShowAddCategory(true)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors min-h-[44px]"
                style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline">Add category</span>
              </button>

              <button
                onClick={() => setShowAddPlace(true)}
                className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                Add place
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-5">
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

          {/* Sort */}
          {places.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="sort-places" className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                Sort by
              </label>
              <select
                id="sort-places"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="rounded-xl border px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Category filter */}
          {categories.length > 0 && (
            <CategoryList categories={categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
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
            nextPlaceId={nextPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={currentUserId}
            onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
          />
        </div>

        {/* Leaderboard sidebar */}
        {places.length >= 2 && (
          <div className="lg:w-72 flex-shrink-0">
            <VoteLeaderboard places={places} voteSummaries={voteSummaries} categories={categories} />
          </div>
        )}
      </div>
    </div>
  );
}
