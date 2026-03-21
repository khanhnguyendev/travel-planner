'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Tag as TagIcon, X, Trash2, CheckSquare, MapPin, Grid, List } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { TRIP_TIMEZONE } from '@/lib/date';
import { extractLocationTag } from '@/lib/address';

interface PlacesSectionProps {
  tripId: string;
  role: TripRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialTags?: Tag[];
  initialPlaceTagIds?: Record<string, string[]>;
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
  initialPlaceTagIds = {},
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
  const [placeTagIds] = useState<Record<string, string[]>>(initialPlaceTagIds);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
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
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
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

  const allLocationTags = useMemo(() => {
    const set = new Set<string>();
    planningPlaces.forEach((p) => {
      const tag = p.address ? extractLocationTag(p.address) : null;
      if (tag) set.add(tag);
    });
    return Array.from(set).sort();
  }, [planningPlaces]);

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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
        <div className="flex flex-col gap-6 md:flex-row md:items-start lg:gap-8">
          {/* Left Sidebar (Desktop Only) */}
          <aside className="sticky top-24 hidden w-64 flex-shrink-0 flex-col gap-8 border-r pr-6 md:flex lg:w-72" style={{ borderColor: 'var(--color-border-muted)' }}>
            {/* Categories Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Categories</h3>
              <div className="flex flex-col gap-1.5">
                <select
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                  className="w-full rounded-[1rem] border bg-white px-3 py-2 text-sm text-stone-600 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <option value="">All Categories</option>
                  {planningCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {editor && (
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="mt-1 flex items-center gap-1.5 px-3 py-0.5 text-xs font-semibold text-stone-400 transition-colors hover:text-stone-600"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add category</span>
                  </button>
                )}
              </div>
            </div>

            {/* Location Tags Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Location</h3>
              <select
                value={selectedLocationTag ?? ''}
                onChange={(e) => setSelectedLocationTag(e.target.value || null)}
                className="w-full rounded-[1rem] border bg-white px-3 py-2 text-sm text-stone-600 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="">All Locations</option>
                {allLocationTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Trip Tags Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Tags</h3>
              <select
                value={selectedTagId ?? ''}
                onChange={(e) => setSelectedTagId(e.target.value || null)}
                className="w-full rounded-[1rem] border bg-white px-3 py-2 text-sm text-stone-600 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>#{tag.name}</option>
                ))}
              </select>
            </div>

            {/* Sort Section */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Sort By</h3>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full rounded-[1rem] border bg-white px-3 py-2 text-sm text-stone-600 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* Search and Action Bar */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex-1">
                  <PlaceSearch
                    places={planningPlaces}
                    onResults={(filtered) =>
                      setSearchResults(filtered.length === planningPlaces.length ? null : filtered)
                    }
                  />
                </div>

                {!selectMode ? (
                  <div className="flex items-center gap-2">
                    {editor && (
                      <button
                        onClick={() => setShowAddPlace(true)}
                        className="btn-primary min-h-[44px] flex-1 md:flex-initial"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add place</span>
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
                      className="flex h-[44px] w-[44px] items-center justify-center rounded-[1.1rem] border transition-colors hover:bg-black/[0.03] md:h-[48px] md:w-auto md:px-4"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                      title="Select multiple"
                    >
                      <CheckSquare className="h-4 w-4" />
                      <span className="hidden md:ml-2 md:inline">Select</span>
                    </button>

                    <div className="hidden items-center gap-1 rounded-[1.1rem] border p-1 md:flex" style={{ borderColor: 'var(--color-border)' }}>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                          viewMode === 'grid' ? "bg-white text-teal-600 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                        title="Grid view"
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('compact')}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                          viewMode === 'compact' ? "bg-white text-teal-600 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                        title="Compact view"
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDelete}
                      disabled={selectedIds.size === 0 || bulkDeleting}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[1rem] bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40 md:flex-initial"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                    </button>
                    <button
                      onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[1rem] border px-3 py-2 text-sm font-semibold transition-colors hover:bg-black/[0.03] md:flex-initial"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile-Only Horizontal Filters */}
              <div className="md:hidden">
                <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1.5 pt-1">
                  {/* Category Select */}
                  <select
                    value={selectedCategoryId ?? ''}
                    onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                    className="min-h-[36px] flex-shrink-0 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 outline-none sm:min-h-[40px]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="">Category</option>
                    {planningCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  {/* Location Select */}
                  <select
                    value={selectedLocationTag ?? ''}
                    onChange={(e) => setSelectedLocationTag(e.target.value || null)}
                    className="min-h-[36px] flex-shrink-0 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 outline-none sm:min-h-[40px]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="">Location</option>
                    {allLocationTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>

                  {/* Tags Select */}
                  <select
                    value={selectedTagId ?? ''}
                    onChange={(e) => setSelectedTagId(e.target.value || null)}
                    className="min-h-[36px] flex-shrink-0 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 outline-none sm:min-h-[40px]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <option value="">Tags</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>#{tag.name}</option>
                    ))}
                  </select>

                  {/* Sort Select */}
                  <div className="flex-shrink-0">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as SortOption)}
                      className="min-h-[36px] rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 outline-none sm:min-h-[40px]"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {editor && (
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="inline-flex min-h-[36px] flex-shrink-0 items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/[0.03] sm:min-h-[40px]"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Category</span>
                    </button>
                  )}

                  <div className="flex flex-shrink-0 items-center gap-1 rounded-full border p-1" style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.8)' }}>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                        viewMode === 'grid' ? "bg-white text-teal-600 shadow-sm" : "text-stone-400"
                      )}
                      aria-label="Grid view"
                    >
                      <Grid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                        viewMode === 'compact' ? "bg-white text-teal-600 shadow-sm" : "text-stone-400"
                      )}
                      aria-label="Compact view"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <PlaceGrid
              places={sortedPlaces}
              categories={categories}
              tripId={tripId}
              selectedCategoryId={selectedCategoryId}
              selectedTagId={selectedTagId}
              placeTagIds={placeTagIds}
              tags={tags}
              selectedLocationTag={selectedLocationTag}
              onLocationTagClick={setSelectedLocationTag}
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
              viewMode={viewMode}
              onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
              onPlaceDeleted={handlePlaceDeleted}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
