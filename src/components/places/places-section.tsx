'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Tag as TagIcon, X, Trash2, CheckSquare } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, TripRole, PlaceComment, PlaceExpenseHistoryEntry, Tag } from '@/lib/types';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryForm } from '@/components/categories/add-category-form';
import { AddPlaceForm } from '@/components/places/add-place-form';
import { PlaceGrid } from '@/components/places/place-grid';
import { PlaceSearch } from '@/components/places/place-search';
import { VoteLeaderboard } from '@/components/places/vote-leaderboard';
import { Dialog } from '@/components/ui/dialog';
import { deletePlace } from '@/features/places/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { TRIP_TIMEZONE } from '@/lib/date';

interface PlacesSectionProps {
  tripId: string;
  role: TripRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialTags?: Tag[];
  initialVoteSummaries: VoteSummaryEntry[];
  initialUserVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
  canVote: boolean;
  canComment: boolean;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  previewMode?: boolean;
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
  initialTags = [],
  initialVoteSummaries,
  initialUserVotes,
  reviewsByPlaceId: initialReviewsByPlaceId,
  placeExpensesByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
  canVote,
  canComment,
  tripStartDate,
  tripEndDate,
  previewMode = false,
}: PlacesSectionProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [tags] = useState<Tag[]>(initialTags);
  const [voteSummaries] = useState<VoteSummaryEntry[]>(initialVoteSummaries);
  const [userVotes] = useState<PlaceVote[]>(initialUserVotes);
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState<Record<string, PlaceReview[]>>(initialReviewsByPlaceId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLocationTag, setSelectedLocationTag] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [searchResults, setSearchResults] = useState<Place[] | null>(null);
  const { confirm } = useConfirm();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const loadingToast = useLoadingToast();

  const editor = canEdit(role);

  useEffect(() => {
    setPlaces(initialPlaces);
    setSearchResults(null);
  }, [initialPlaces]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    setReviewsByPlaceId(initialReviewsByPlaceId);
  }, [initialReviewsByPlaceId]);

  const accommodationCategoryIds = useMemo(
    () => new Set(categories.filter((category) => category.category_type === 'accommodation').map((category) => category.id)),
    [categories]
  );

  const planningCategories = useMemo(
    () => categories.filter((category) => category.category_type !== 'accommodation'),
    [categories]
  );

  const planningPlaces = useMemo(
    () => places.filter((place) => !accommodationCategoryIds.has(place.category_id)),
    [accommodationCategoryIds, places]
  );

  useEffect(() => {
    if (selectedCategoryId && !planningCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [planningCategories, selectedCategoryId]);

  function handleCategoryCreated(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  function handlePlaceAdded(place: Place, reviews: PlaceReview[]) {
    setPlaces((prev) => [place, ...prev]);
    if (reviews.length > 0) {
      setReviewsByPlaceId((prev) => ({ ...prev, [place.id]: reviews }));
    }
  }

  function handlePlaceDeleted(placeId: string) {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(placeId); return next; });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const isConfirmed = await confirm({
      title: 'Remove Places',
      message: `Remove ${selectedIds.size} place${selectedIds.size > 1 ? 's' : ''} from this trip?`,
      okText: 'Remove',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    setBulkDeleting(true);
    const resolve = loadingToast(`Removing ${selectedIds.size} places…`);
    const results = await Promise.all([...selectedIds].map((id) => deletePlace(id)));
    const failed = results.filter((r) => !r.ok).length;
    setBulkDeleting(false);
    if (failed === 0) {
      resolve('Places removed', 'success');
      const deleted = new Set(selectedIds);
      setPlaces((prev) => prev.filter((p) => !deleted.has(p.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } else {
      resolve(`${failed} failed to delete`, 'error');
      const succeeded = [...selectedIds].filter((_, i) => results[i].ok);
      setPlaces((prev) => prev.filter((p) => !succeeded.includes(p.id)));
      setSelectedIds((prev) => { const next = new Set(prev); succeeded.forEach((id) => next.delete(id)); return next; });
    }
  }

  const basePlaces = searchResults ?? planningPlaces;
  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const nextPlaceId = useMemo(() => {
    let closest: Place | null = null;
    let closestDiff = Infinity;

    for (const place of planningPlaces) {
      if (!place.visit_date || !place.visit_time_from) continue;
      const [hours, minutes] = place.visit_time_from.split(':').map(Number);
      const timestamp = new Date(
        `${place.visit_date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00${TRIP_TIMEZONE === 'Asia/Ho_Chi_Minh' ? '+07:00' : ''}`
      ).getTime();
      const diff = timestamp - Date.now();
      if (diff > 0 && diff < closestDiff) {
        closestDiff = diff;
        closest = place;
      }
    }

    return closest?.id ?? null;
  }, [planningPlaces]);

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
    <div className="space-y-4 sm:space-y-5">
      {/* Dialogs */}
      {showAddCategory && editor && (
        <Dialog title="Add category" onClose={() => setShowAddCategory(false)} maxWidth="sm:max-w-sm">
          <AddCategoryForm
            tripId={tripId}
            onCreated={(cat) => { handleCategoryCreated(cat); setShowAddCategory(false); }}
            onCancel={() => setShowAddCategory(false)}
            refreshTripAfterCreate
          />
        </Dialog>
      )}

      {showAddPlace && editor && (
        <Dialog title="Add a place" onClose={() => setShowAddPlace(false)} maxWidth="sm:max-w-lg">
          <AddPlaceForm
            tripId={tripId}
            categories={categories}
            tags={tags}
            onAdded={(place, reviews) => { handlePlaceAdded(place, reviews); setShowAddPlace(false); }}
            onCancel={() => setShowAddPlace(false)}
          />
        </Dialog>
      )}

      {!previewMode && planningPlaces.length >= 2 && (
        <VoteLeaderboard places={planningPlaces} voteSummaries={voteSummaries} categories={planningCategories} />
      )}

      {(planningPlaces.length > 0 || planningCategories.length > 0) && (
      <div className="section-shell overflow-hidden p-3 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            {planningPlaces.length > 0 && (
              <div className="min-w-0 flex-1">
                <PlaceSearch
                  places={planningPlaces}
                  onResults={(filtered) =>
                    setSearchResults(filtered.length === planningPlaces.length ? null : filtered)
                  }
                />
              </div>
            )}

            {editor && planningPlaces.length > 0 && !selectMode && (
              <button
                onClick={() => setShowAddPlace(true)}
                className="hidden min-h-[48px] items-center gap-2 rounded-[1.1rem] bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm transition-transform hover:-translate-y-0.5 md:inline-flex"
              >
                <Plus className="h-4 w-4" />
                Add place
              </button>
            )}
            {editor && planningPlaces.length > 0 && !selectMode && (
              <button
                onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
                className="hidden min-h-[48px] items-center gap-2 rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition-colors hover:bg-black/[0.03] md:inline-flex"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <CheckSquare className="h-4 w-4" />
                Select
              </button>
            )}
            {selectMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || bulkDeleting}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[1rem] bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                </button>
                <button
                  onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[1rem] border px-3 py-2 text-sm font-semibold transition-colors hover:bg-black/[0.03]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1">
            {planningPlaces.length > 1 && (
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <label htmlFor="sort-places" className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                  Sort
                </label>
                <select
                  id="sort-places"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="min-h-[36px] rounded-full border px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500 sm:min-h-[40px] sm:text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {planningCategories.length > 0 && (
              <CategoryList
                categories={planningCategories}
                selectedId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
                inline
              />
            )}

            {selectedLocationTag && (
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  onClick={() => setSelectedLocationTag(null)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:px-3 sm:text-xs"
                  style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
                >
                  {selectedLocationTag}
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {editor && (
              <button
                onClick={() => setShowAddCategory(true)}
                className="inline-flex min-h-[36px] flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/[0.03] sm:min-h-[40px] sm:gap-2 sm:py-2 sm:text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
                aria-label="Add category"
              >
                <TagIcon className="h-4 w-4" />
                <span className="hidden sm:inline">+ Category</span>
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      <PlaceGrid
        places={sortedPlaces}
        categories={planningCategories}
        tripId={tripId}
        selectedCategoryId={selectedCategoryId}
        selectedLocationTag={selectedLocationTag}
        onLocationTagClick={(tag) =>
          setSelectedLocationTag((prev) => (prev === tag ? null : tag))
        }
        voteSummaries={voteSummaries}
        userVotes={userVotes}
        reviewsByPlaceId={reviewsByPlaceId}
        placeExpensesByPlaceId={placeExpensesByPlaceId}
        nextPlaceId={nextPlaceId}
        commentsByPlaceId={commentsByPlaceId}
        commentAuthors={commentAuthors}
        currentUserId={currentUserId}
        canVote={canVote}
        canComment={canComment}
        showExpenseHistory={canComment}
        canEdit={editor}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        previewMode={previewMode}
        onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
        onPlaceDeleted={handlePlaceDeleted}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={(id) => setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        })}
      />
    </div>
  );
}
