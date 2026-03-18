'use client';

import { useState } from 'react';
import { CalendarDays, Clock, Bookmark, Navigation } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment } from '@/lib/types';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';
import { cn } from '@/lib/utils';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface TripTimelineProps {
  places: Place[];
  categories: Category[];
  tripId: string;
  currentUserId: string;
  canEdit?: boolean;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
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
  if (!from && !to) return 'Flexible';
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return 'Flexible';
}

function LocalCategoryBadge({ category }: { category: Category | undefined }) {
  if (!category) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
        "bg-white/50 border-slate-200/50 text-slate-600"
      )}
    >
      {category.icon && <span className="text-[14px] leading-none">{category.icon}</span>}
      {category.name}
    </span>
  );
}

interface PlaceRowProps {
  place: Place;
  category: Category | undefined;
  onClick?: (place: Place) => void;
  isNext?: boolean;
}

function PlaceRow({ place, category, onClick, isNext }: PlaceRowProps) {
  const timeLabel = formatTimeRange(place.visit_time_from, place.visit_time_to);
  const isBackup = !!place.backup_place_id;

  return (
    <button
      onClick={() => onClick?.(place)}
      className={cn(
        "group w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border text-left",
        isNext 
          ? "bg-primary/5 border-primary/20 shadow-soft" 
          : "bg-white border-slate-100 hover:border-primary/30 hover:shadow-soft"
      )}
    >
      {/* Time */}
      <div className="flex flex-col items-center justify-center min-w-[80px] text-center border-r border-slate-100 pr-4">
        <Clock className="w-3.5 h-3.5 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
          {timeLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
            {place.name}
          </span>
          {isNext && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 animate-pulse">
              <Navigation className="w-3 h-3 fill-current" />
              Next Stop
            </span>
          )}
          {isBackup && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
              <Bookmark className="w-3 h-3" />
              Backup
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {category && <LocalCategoryBadge category={category} />}
          {place.address && (
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {place.address}
            </p>
          )}
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
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  commentsByPlaceId,
  commentAuthors,
}: TripTimelineProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  const categoryMap = new Map<string, Category>(
    categories.map((c) => [c.id, c])
  );

  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const userVoteMap = Object.fromEntries(userVotes.map((v) => [v.place_id, v]));

  const openPlace = openPlaceId ? places.find((p) => p.id === openPlaceId) ?? null : null;

  const scheduled = places.filter((p) => p.visit_date);
  const unscheduled = places.filter((p) => !p.visit_date);

  const groupedByDate = new Map<string, Place[]>();
  for (const place of scheduled) {
    const date = place.visit_date!;
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date)!.push(place);
  }

  const sortedDates = Array.from(groupedByDate.keys()).sort();

  if (scheduled.length === 0 && unscheduled.length === 0) {
    return (
      <div className="card-premium flex flex-col items-center py-20 text-center bg-slate-50/50 border-dashed border-2">
        <div className="w-16 h-16 rounded-[2rem] bg-indigo-100 flex items-center justify-center mb-6 shadow-soft">
          <CalendarDays className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-2">Schedule is empty</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Assign dates to your destinations to see your trip itinerary take shape here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Scheduled section */}
      {scheduled.length > 0 && (
        <div className="relative pl-1">
          {/* Vertical timeline line */}
          <div className="absolute left-[19.5px] top-6 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-primary via-primary/50 to-primary/10 shadow-sm" />

          <div className="space-y-12">
            {sortedDates.map((date) => {
              const dayPlaces = groupedByDate.get(date)!;
              return (
                <div key={date} className="relative pl-12">
                  {/* Day dot */}
                  <div className="absolute left-0 top-1 w-10 h-10 rounded-2xl bg-white shadow-premium border border-slate-100 flex items-center justify-center z-10 transition-transform hover:scale-110">
                    <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(20,184,166,0.6)]" />
                  </div>

                  {/* Day header */}
                  <div className="flex items-center gap-4 mb-6">
                    <h3 className="font-display font-bold text-xl text-foreground tracking-tight">
                      {formatDayHeader(date)}
                    </h3>
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-muted-foreground border border-slate-200">
                      {dayPlaces.length} stop{dayPlaces.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Places for this day */}
                  <div className="space-y-3">
                    {dayPlaces.map((place) => (
                      <PlaceRow
                        key={place.id}
                        place={place}
                        category={categoryMap.get(place.category_id)}
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
        <div className="pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6 ml-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
               <Bookmark className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-500">Unscheduled Gems</h3>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {unscheduled.length} potential stop{unscheduled.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unscheduled.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                category={categoryMap.get(place.category_id)}
                onClick={(p) => setOpenPlaceId(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Place detail drawer */}
      {openPlace && (
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
          allPlaces={places}
          canEdit={canEdit}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </div>
  );
}
