'use client';

import { useState } from 'react';
import type { Place, Category, PlaceVote, PlaceReview } from '@/lib/types';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { PlacesMap } from '@/components/places/places-map';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';

interface MapTabClientProps {
  projectId: string;
  places: Place[];
  categories: Category[];
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
}

export function MapTabClient({
  projectId,
  places,
  categories,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
}: MapTabClientProps) {
  const [openPlace, setOpenPlace] = useState<Place | null>(null);

  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const userVoteMap = Object.fromEntries(userVotes.map((v) => [v.place_id, v]));

  return (
    <>
      <PlacesMap
        places={places}
        categories={categories}
        onPlaceClick={setOpenPlace}
      />

      {openPlace && (
        <PlaceDetailDrawer
          place={openPlace}
          reviews={reviewsByPlaceId[openPlace.id] ?? []}
          category={categories.find((c) => c.id === openPlace.category_id) ?? null}
          projectId={projectId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          allPlaces={places}
          onClose={() => setOpenPlace(null)}
        />
      )}
    </>
  );
}
