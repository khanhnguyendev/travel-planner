'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Bookmark } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface TripTimelineProps {
  places: Place[];
  categories: Category[];
  tripId: string;
  currentUserId: string;
  canEdit?: boolean;
  canVote: boolean;
  canComment: boolean;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  previewMode?: boolean;
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatTimeRange(from: string | null, to: string | null): string {
  if (!from && !to) return 'Any time';
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'Any time';
}

function CategoryBadge({ category }: { category: Category | undefined }) {
  if (!category) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: category.color ?? 'var(--color-bg-subtle)',
        color: '#1C1917',
      }}
    >
      {category.icon && <span>{category.icon}</span>}
      {category.name}
    </span>
  );
}

interface PlaceRowProps {
  place: Place;
  category: Category | undefined;
  previewMode?: boolean;
  onClick?: (place: Place) => void;
}

function PlaceRow({ place, category, previewMode = false, onClick }: PlaceRowProps) {
  const timeLabel = formatTimeRange(place.visit_time_from, place.visit_time_to);
  const isBackup = !!place.backup_place_id;

  return (
    <button
      onClick={() => onClick?.(place)}
      className="flex min-h-[0] w-full flex-col gap-2 rounded-xl p-2.5 text-left transition-colors hover:bg-[var(--color-bg-muted)] sm:flex-row sm:items-start sm:gap-3 sm:p-3"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      {!previewMode && (
        <div
          className="mt-0.5 flex items-center gap-1 text-[11px] flex-shrink-0 sm:w-24 sm:text-xs md:w-28"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{timeLabel}</span>
        </div>
      )}

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-medium text-sm truncate"
            style={{ color: 'var(--color-text)' }}
          >
            {place.name}
          </span>
          {isBackup && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
              style={{
                backgroundColor: 'var(--color-secondary-light)',
                color: 'var(--color-secondary)',
              }}
            >
              <Bookmark className="w-3 h-3" />
              Backup
            </span>
          )}
        </div>
        {category && (
          <div className="mt-1">
            <CategoryBadge category={category} />
          </div>
        )}
        {previewMode && place.address && (
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>
            {place.address}
          </p>
        )}
      </div>
    </button>
  );
}

export function TripTimeline({
  places,
  categories,
  tripId,
  currentUserId,
  canEdit = false,
  canVote,
  canComment,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  placeExpensesByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  tripStartDate,
  tripEndDate,
  previewMode = false,
}: TripTimelineProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  // Build category lookup
  const categoryMap = new Map<string, Category>(
    categories.map((c) => [c.id, c])
  );

  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const userVoteMap = Object.fromEntries(userVotes.map((v) => [v.place_id, v]));

  const openPlace = openPlaceId ? places.find((p) => p.id === openPlaceId) ?? null : null;

  // Separate scheduled vs unscheduled
  const scheduled = places.filter((p) => p.visit_date);
  const unscheduled = places.filter((p) => !p.visit_date);

  // Group scheduled places by date
  const groupedByDate = new Map<string, Place[]>();
  for (const place of scheduled) {
    const date = place.visit_date!;
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date)!.push(place);
  }

  // Sort dates ascending
  const sortedDates = Array.from(groupedByDate.keys()).sort();

  if (scheduled.length === 0 && unscheduled.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <CalendarDays className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <p className="font-medium text-sm text-stone-800 mb-1">No places yet</p>
        <p className="text-xs text-stone-400 max-w-xs">
          Add places to your trip to see them on the timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {previewMode && (
        <div className="rounded-[1.2rem] bg-stone-950/[0.03] px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Public preview keeps the plan lightweight. You can browse which places are in the plan without revealing exact trip timing.
        </div>
      )}
      {/* Scheduled section */}
      {scheduled.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CalendarDays className="w-8 h-8 mb-2" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="text-sm text-stone-500">
            No places scheduled yet — add visit dates to your places
          </p>
        </div>
      ) : previewMode ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm text-stone-800">Scheduled places</h3>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: '#0D9488' }}
            >
              {scheduled.length}
            </span>
          </div>

          <div className="space-y-2">
            {scheduled.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                category={categoryMap.get(place.category_id)}
                previewMode
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute bottom-4 left-3.5 top-7 w-0.5 rounded-full sm:left-4 sm:top-8"
            style={{ backgroundColor: '#0D9488' }}
          />

          <div className="space-y-6 sm:space-y-8">
            {sortedDates.map((date) => {
              const dayPlaces = groupedByDate.get(date)!;
              return (
                <div key={date} className="relative pl-10 sm:pl-12">
                  {/* Day dot */}
                  <div
                    className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full border-2 border-white sm:left-2"
                    style={{ backgroundColor: '#0D9488' }}
                  />

                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-semibold text-sm text-stone-800">
                      {formatDayHeader(date)}
                    </h3>
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: '#0D9488' }}
                    >
                      {dayPlaces.length}
                    </span>
                  </div>

                  {/* Places for this day */}
                  <div className="space-y-2">
                    {dayPlaces.map((place) => (
                      <PlaceRow
                        key={place.id}
                        place={place}
                        category={categoryMap.get(place.category_id)}
                        previewMode={previewMode}
                        onClick={(p) => setOpenPlaceId(p.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled section */}
      {unscheduled.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm text-stone-500">Unscheduled</h3>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                color: 'var(--color-text-muted)',
              }}
            >
              {unscheduled.length}
            </span>
          </div>
          <div className="space-y-2">
            {unscheduled.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                category={categoryMap.get(place.category_id)}
                previewMode={previewMode}
                onClick={(p) => setOpenPlaceId(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Place detail drawer */}
      {openPlace && !previewMode && (
        <PlaceDetailDrawer
          place={openPlace}
          reviews={reviewsByPlaceId[openPlace.id] ?? []}
          comments={commentsByPlaceId[openPlace.id] ?? []}
          commentAuthors={commentAuthors}
          currentUserId={currentUserId}
          category={categoryMap.get(openPlace.category_id) ?? null}
          tripId={tripId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          placeExpenses={placeExpensesByPlaceId[openPlace.id] ?? []}
          canVote={canVote}
          canComment={canComment}
          showExpenseHistory={canComment}
          allPlaces={places}
          canEdit={canEdit}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </div>
  );
}
