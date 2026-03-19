'use client';

import { useState } from 'react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { PlacesMap } from '@/components/places/places-map';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';

interface MapTabClientProps {
  tripId: string;
  places: Place[];
  categories: Category[];
  canVote: boolean;
  canComment: boolean;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  currentUserId: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  previewMode?: boolean;
}

export function MapTabClient({
  tripId,
  places,
  categories,
  canVote,
  canComment,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  placeExpensesByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  currentUserId,
  tripStartDate,
  tripEndDate,
  previewMode = false,
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

      {openPlace && !previewMode && (
        <PlaceDetailDrawer
          place={openPlace}
          reviews={reviewsByPlaceId[openPlace.id] ?? []}
          comments={commentsByPlaceId[openPlace.id] ?? []}
          commentAuthors={commentAuthors}
          currentUserId={currentUserId}
          category={categories.find((c) => c.id === openPlace.category_id) ?? null}
          tripId={tripId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          placeExpenses={placeExpensesByPlaceId[openPlace.id] ?? []}
          canVote={canVote}
          canComment={canComment}
          showExpenseHistory={canComment}
          allPlaces={places}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onClose={() => setOpenPlace(null)}
        />
      )}
    </>
  );
}
