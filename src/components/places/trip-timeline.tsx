'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Bookmark, ChevronRight, MapPin } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { cn } from '@/lib/utils';

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
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date);
  return `${weekday}, ${day}`;
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
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{
        backgroundColor: `${category.color}15` || 'var(--color-bg-subtle)',
        color: category.color || 'var(--color-text-subtle)',
      }}
    >
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
  const icon = category?.icon || '📍';

  return (
    <button
      onClick={() => onClick?.(place)}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden border bg-white transition-all',
        'rounded-[1.1rem] shadow-[0_8px_20px_rgba(87,67,40,0.04)]',
        'border-stone-200/80 hover:border-stone-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-3'
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 sm:flex-1">
        {/* Icon/Emoji Box */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg leading-none transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${category?.color}15` || 'var(--color-bg-subtle)' }}
        >
          <span className="grayscale-[0.2] group-hover:grayscale-0">{icon}</span>
        </div>

        {/* Middle: Name + Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {place.name}
            </span>
            {isBackup && (
              <span
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}
              >
                <Bookmark className="h-2.5 w-2.5" />
                Backup
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
            {!previewMode && (
              <>
                <div className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 opacity-60" />
                  <span>{timeLabel}</span>
                </div>
                <span className="opacity-40">·</span>
              </>
            )}
            <CategoryBadge category={category} />
          </div>
        </div>

        {/* Right: Chevron */}
        <div className="hidden sm:block">
          <ChevronRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-40" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
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
          className="w-16 h-16 rounded-[2rem] flex items-center justify-center mb-4 shadow-sm"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <CalendarDays className="w-8 h-8 opacity-40" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <p className="font-semibold text-base section-title mb-1" style={{ color: 'var(--color-text)' }}>No places saved yet</p>
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Search for places or categories to start building your collective trip plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {previewMode && (
        <div className="rounded-[1.2rem] border px-4 py-3.5 text-sm leading-relaxed" style={{ backgroundColor: 'var(--color-bg-subtle)', borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <p>
            Public preview keeps the plan lightweight. Browse saved places without revealing exact trip timing.
          </p>
        </div>
      )}
      {/* Scheduled section */}
      {scheduled.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center rounded-[1.5rem] border-2 border-dashed" style={{ borderColor: 'var(--color-border-muted)' }}>
          <Clock className="w-8 h-8 mb-3 opacity-20" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Nothing scheduled yet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Add visit dates to your places to see them here.
          </p>
        </div>
      ) : previewMode ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Scheduled places
            </h3>
            <span
              className="inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold text-white"
              style={{ backgroundColor: '#14B8A6' }}
            >
              {scheduled.length}
            </span>
          </div>

          <div className="space-y-2.5">
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
          {/* Vertical timeline line - refined */}
          <div
            className="absolute bottom-6 left-[15px] top-8 w-[3px] rounded-full sm:left-[19px] sm:top-10"
            style={{ backgroundColor: '#14B8A6', opacity: 0.15 }}
          />

          <div className="space-y-8 sm:space-y-10">
            {sortedDates.map((date) => {
              const dayPlaces = groupedByDate.get(date)!;
              return (
                <div key={date} className="relative pl-10 sm:pl-12">
                  {/* Day marker - Refined dot */}
                  <div
                    className="absolute left-[9px] top-2 z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white shadow-sm sm:left-[13px]"
                    style={{ backgroundColor: '#14B8A6' }}
                  />

                  {/* Day header - Refined */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold section-title tracking-tight" style={{ color: 'var(--color-text)' }}>
                        {formatDayHeader(date)}
                      </h3>
                      <span
                        className="inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: '#14B8A6' }}
                      >
                        {dayPlaces.length}
                      </span>
                    </div>
                  </div>

                  {/* Places for this day */}
                  <div className="space-y-3">
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
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Unscheduled
            </h3>
            <span
              className="inline-flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold"
              style={{
                backgroundColor: 'var(--color-bg-subtle)',
                color: 'var(--color-text-muted)',
              }}
            >
              {unscheduled.length}
            </span>
          </div>
          <div className="space-y-3">
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
