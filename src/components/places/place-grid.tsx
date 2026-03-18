'use client';

import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment } from '@/lib/types';
import { PlaceCard } from './place-card';
import { extractLocationTag } from '@/lib/address';
import { PlaceDetailDrawer } from './place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlaceGridProps {
  places: Place[];
  categories: Category[];
  tripId: string;
  selectedCategoryId: string | null;
  selectedLocationTag: string | null;
  onLocationTagClick: (tag: string) => void;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  nextPlaceId: string | null;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
  canEdit?: boolean;
  onAddPlace?: () => void;
}

export function PlaceGrid({
  places,
  categories,
  tripId,
  selectedCategoryId,
  selectedLocationTag,
  onLocationTagClick,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  nextPlaceId,
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
  canEdit = false,
  onAddPlace,
}: PlaceGridProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const voteSummaryMap = Object.fromEntries(
    voteSummaries.map((v) => [v.placeId, v])
  );
  const userVoteMap = Object.fromEntries(
    userVotes.map((v) => [v.place_id, v])
  );

  // Filter by selected category and/or location tag
  const filtered = places.filter((p) => {
    if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
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
      <div className="card-premium flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-slate-50/50">
        <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-6 shadow-soft">
          <MapPin className="w-8 h-8 text-primary shadow-premium" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-2">
          {selectedCategoryId ? 'No destinations in this category' : 'Start your adventure'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
          {selectedCategoryId
            ? 'Try selecting a different filter or clear your current selection to see all places.'
            : 'Add places you want to visit! Paste a Google Maps link or search for a destination to get started.'}
        </p>
        {!selectedCategoryId && onAddPlace && (
          <button
            onClick={onAddPlace}
            className="btn-premium flex items-center gap-2 h-[48px] px-8"
          >
            <Plus className="w-5 h-5" />
            Add First Destination
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-12">
        {Array.from(grouped.entries()).map(([catId, catPlaces]) => {
          const cat = categoryMap[catId] ?? null;
          return (
            <div key={catId} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Category header — only show when "All" is selected */}
              {!selectedCategoryId && cat && (
                <div className="flex items-center gap-3 mb-6 ml-1">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-soft border border-slate-100 flex items-center justify-center text-lg leading-none">
                    {cat.icon || <MapPin className="w-4 h-4 text-primary" />}
                  </div>
                  <h3 className="font-display font-bold text-lg text-foreground tracking-tight">
                    {cat.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-md">
                    {catPlaces.length}
                  </span>
                </div>
              )}

              {/* Responsive grid: 1 col mobile, 2 on md, 3 on lg */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catPlaces.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    category={cat}
                    tripId={tripId}
                    voteSummary={voteSummaryMap[place.id] ?? null}
                    userVote={userVoteMap[place.id] ?? null}
                    comments={commentsByPlaceId[place.id] ?? []}
                    isNext={place.id === nextPlaceId}
                    onClick={() => setOpenPlaceId(place.id)}
                    onLocationTagClick={onLocationTagClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {openPlace && (
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
          allPlaces={places}
          canEdit={canEdit}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </>
  );
}
