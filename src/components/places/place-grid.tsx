'use client';

import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment, PlaceExpenseHistoryEntry, Tag } from '@/lib/types';
import { PlaceCard } from './place-card';
import { extractLocationTag } from '@/lib/address';
import { cn } from '@/lib/utils';
import { PlaceDetailDrawer } from './place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlaceGridProps {
  places: Place[];
  categories: Category[];
  tripId: string;
  selectedCategoryId: string | null;
  selectedTagId?: string | null;
  placeTagIds?: Record<string, string[]>;
  tags?: Tag[];
  selectedLocationTag: string | null;
  onLocationTagClick: (tag: string) => void;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  nextPlaceId: string | null;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
  canVote: boolean;
  canComment: boolean;
  showExpenseHistory?: boolean;
  canEdit?: boolean;
  previewMode?: boolean;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onAddPlace?: () => void;
  onPlaceDeleted?: (placeId: string) => void;
  selectMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (placeId: string) => void;
  viewMode?: 'grid' | 'compact';
}

export function PlaceGrid({
  places,
  categories,
  tripId,
  selectedCategoryId,
  selectedTagId,
  placeTagIds = {},
  tags = [],
  selectedLocationTag,
  onLocationTagClick,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  placeExpensesByPlaceId,
  nextPlaceId,
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
  canVote,
  canComment,
  showExpenseHistory = false,
  canEdit = false,
  previewMode = false,
  tripStartDate,
  tripEndDate,
  onAddPlace,
  onPlaceDeleted,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  viewMode = 'grid',
}: PlaceGridProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const tagNameMap = Object.fromEntries(tags.map((t) => [t.id, t.name]));
  const voteSummaryMap = Object.fromEntries(
    voteSummaries.map((v) => [v.placeId, v])
  );
  const userVoteMap = Object.fromEntries(
    userVotes.map((v) => [v.place_id, v])
  );

  // Filter by selected category, tag, and/or location tag
  const filtered = places.filter((p) => {
    if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
    if (selectedTagId) {
      const tagIds = placeTagIds[p.id] ?? [];
      if (!tagIds.includes(selectedTagId)) return false;
    }
    if (selectedLocationTag) {
      const tag = p.address ? extractLocationTag(p.address) : null;
      if (tag !== selectedLocationTag) return false;
    }
    return true;
  });

  // Group by category for display headers
  const grouped = new Map<string, Place[]>();
  for (const place of filtered) {
    const key = place.category_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(place);
  }

  const openPlace = openPlaceId ? places.find((p) => p.id === openPlaceId) : null;

  if (filtered.length === 0) {
    return (
      <div
        className="section-shell flex flex-col items-center justify-center py-16 text-center"
      >
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-white shadow-sm"
        >
          <MapPin className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
        </div>
        <p className="mb-1 text-base font-semibold section-title text-stone-800">
          {selectedCategoryId ? 'No places in this category yet' : 'Add your first destination'}
        </p>
        <p className="text-sm text-stone-400 max-w-xs mb-5">
          {selectedCategoryId
            ? 'Try selecting a different category or add a new place.'
            : 'Search with Mapbox and build a shortlist your group can vote on.'}
        </p>
        {!selectedCategoryId && onAddPlace && (
          <button
            onClick={onAddPlace}
            className="btn-primary inline-flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add place
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([catId, catPlaces]) => {
          const cat = categoryMap[catId] ?? null;
          return (
            <div key={catId}>
              {/* Category header — only show when "All" is selected */}
              {!selectedCategoryId && cat && (
                <div className="mb-4 flex items-center gap-2">
                  {cat.icon && (
                    <span className="text-lg leading-none">{cat.icon}</span>
                  )}
                  <h3
                    className="text-sm font-semibold section-title text-stone-800"
                  >
                    {cat.name}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {catPlaces.length}
                  </span>
                </div>
              )}

              {/* Responsive grid: 1 col mobile, 2 on md, 3 on lg */}
              <div className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                viewMode === 'compact' && "gap-3 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {catPlaces.map((place) => {
                  const isSelected = selectedIds?.has(place.id) ?? false;
                  return (
                    <div key={place.id} className="relative">
                      {selectMode && (
                        <button
                          type="button"
                          onClick={() => onToggleSelect?.(place.id)}
                          className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                          style={{
                            backgroundColor: isSelected ? '#0D9488' : 'white',
                            borderColor: isSelected ? '#0D9488' : '#D1D5DB',
                          }}
                          aria-label={isSelected ? 'Deselect' : 'Select'}
                        >
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <PlaceCard
                        place={place}
                        category={cat}
                        tripId={tripId}
                        voteSummary={voteSummaryMap[place.id] ?? null}
                        userVote={userVoteMap[place.id] ?? null}
                        comments={commentsByPlaceId[place.id] ?? []}
                        placeExpenses={placeExpensesByPlaceId[place.id] ?? []}
                        canVote={!selectMode && canVote}
                        isNext={place.id === nextPlaceId}
                        previewMode={previewMode}
                        compact={viewMode === 'compact'}
                        tags={(placeTagIds[place.id] ?? []).map((id) => tagNameMap[id]).filter(Boolean)}
                        onClick={
                          previewMode
                            ? undefined
                            : selectMode
                              ? () => onToggleSelect?.(place.id)
                              : () => setOpenPlaceId(place.id)
                        }
                        onLocationTagClick={selectMode ? undefined : onLocationTagClick}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {openPlace && !previewMode && (
        <PlaceDetailDrawer
          place={openPlace}
          reviews={reviewsByPlaceId[openPlace.id] ?? []}
          comments={commentsByPlaceId[openPlace.id] ?? []}
          commentAuthors={commentAuthors}
          currentUserId={currentUserId}
          category={categoryMap[openPlace.category_id] ?? null}
          tripId={tripId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          placeExpenses={placeExpensesByPlaceId[openPlace.id] ?? []}
          canVote={canVote}
          canComment={canComment}
          showExpenseHistory={showExpenseHistory}
          allPlaces={places}
          canEdit={canEdit}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onClose={() => setOpenPlaceId(null)}
          onDeleted={() => { onPlaceDeleted?.(openPlace.id); setOpenPlaceId(null); }}
        />
      )}
    </>
  );
}
