'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview } from '@/lib/types';
import { PlaceCard } from './place-card';
import { PlaceDetailDrawer } from './place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlaceGridProps {
  places: Place[];
  categories: Category[];
  projectId: string;
  selectedCategoryId: string | null;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
}

export function PlaceGrid({
  places,
  categories,
  projectId,
  selectedCategoryId,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
}: PlaceGridProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const voteSummaryMap = Object.fromEntries(
    voteSummaries.map((v) => [v.placeId, v])
  );
  const userVoteMap = Object.fromEntries(
    userVotes.map((v) => [v.place_id, v])
  );

  // Filter by selected category
  const filtered = selectedCategoryId
    ? places.filter((p) => p.category_id === selectedCategoryId)
    : places;

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
        className="card flex flex-col items-center justify-center py-16 text-center"
        style={{ borderStyle: 'dashed' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <MapPin className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {selectedCategoryId ? 'No places in this category yet' : 'No places yet'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Paste a Google Maps link above to add the first one.
        </p>
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
                <div className="flex items-center gap-2 mb-4">
                  {cat.icon && (
                    <span className="text-lg leading-none">{cat.icon}</span>
                  )}
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {cat.name}
                  </h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-bg-subtle)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {catPlaces.length}
                  </span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catPlaces.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    category={cat}
                    projectId={projectId}
                    voteSummary={voteSummaryMap[place.id] ?? null}
                    userVote={userVoteMap[place.id] ?? null}
                    onClick={() => setOpenPlaceId(place.id)}
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
          category={categoryMap[openPlace.category_id] ?? null}
          projectId={projectId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </>
  );
}
