import { Star, MapPin, DollarSign, Clock, ShieldAlert, CalendarDays, Navigation, MessageCircle, NotebookPen } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { cn } from '@/lib/utils';
import { extractLocationTag } from '@/lib/address';
import { PlaceMapLinks } from './place-map-links';
import { CheckInStatusBadge } from './check-in-out-button';
import { PlaceExpenseSummary } from './place-expense-summary';

interface PlaceCardProps {
  place: Place;
  category: Category | null;
  tripId: string;
  voteSummary: VoteSummaryEntry | null;
  userVote: PlaceVote | null;
  comments?: PlaceComment[];
  placeExpenses?: PlaceExpenseHistoryEntry[];
  canVote?: boolean;
  previewMode?: boolean;
  isNext?: boolean;
  onClick?: () => void;
  onLocationTagClick?: (tag: string) => void;
  tags?: string[]; // tag names for display
  viewMode?: 'card' | 'list';
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < full || (i === full && hasHalf);
        return (
          <Star
            key={i}
            className={cn("w-3 h-3", filled ? "fill-current" : "")}
            style={{ color: filled ? '#EAB308' : 'var(--color-border)' }}
          />
        );
      })}
      <span className="ml-1 text-[10px] font-medium text-stone-400">{rating.toFixed(1)}</span>
    </div>
  );
}

function PriceDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Price level: ${level} of 4`}>
      {Array.from({ length: 4 }, (_, i) => (
        <DollarSign
          key={i}
          className="w-2.5 h-2.5"
          style={{ color: i < level ? 'var(--color-secondary)' : 'var(--color-border)' }}
        />
      ))}
    </div>
  );
}

export function PlaceCard({
  place,
  category,
  tripId,
  voteSummary,
  userVote,
  comments = [],
  placeExpenses = [],
  canVote = true,
  previewMode = false,
  isNext = false,
  onClick,
  onLocationTagClick,
  tags = [],
  viewMode = 'card',
}: PlaceCardProps) {
  const isList = viewMode === 'list';
  const hasSchedule = place.visit_date || place.visit_time_from;
  const meta = place.metadata_json as {
    country?: string; region?: string; district?: string;
    place?: string; street?: string; postcode?: string;
    feature_type?: string; place_formatted?: string;
  } | null;
  const displayAddress = place.address ?? meta?.place_formatted;
  const locationTags: string[] = meta?.place
    ? [meta.place]
    : place.address ? [extractLocationTag(place.address)].filter(Boolean) as string[] : [];

  if (isList) {
    return (
      <div
        className={cn(
          'section-shell flex items-center gap-3 p-2.5 cursor-pointer hover:bg-black/[0.02] transition-all',
          isNext && 'ring-2 ring-teal-500 ring-offset-1'
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {/* Left Side: Icon */}
        <div 
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg shadow-sm"
          style={{ backgroundColor: category?.color ? `${category.color}20` : 'var(--color-bg-muted)', color: category?.color ?? 'var(--color-primary)' }}
        >
          {category?.icon ?? <MapPin className="h-5 w-5" />}
        </div>

        {/* Middle: Content */}
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="line-clamp-1 text-sm font-bold text-stone-800 tracking-tight">
              {place.name}
            </h3>
            {isNext && (
              <span className="flex items-center gap-1 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 uppercase">
                Next
              </span>
            )}
            {category && <span className="text-[10px] text-stone-400 font-medium px-1.5 py-0.5 rounded-md bg-stone-100 uppercase tracking-wider">{category.name}</span>}
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {displayAddress && (
              <p className="flex items-center gap-1 text-[11px] text-stone-400 line-clamp-1">
                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                {displayAddress}
              </p>
            )}
            {(place.rating != null || place.price_level != null) && (
              <div className="flex items-center gap-2 border-l pl-2 ml-1 first:border-l-0 first:pl-0 first:ml-0" style={{ borderColor: 'var(--color-border)' }}>
                {place.rating != null && <StarRating rating={place.rating} />}
                {place.price_level != null && <PriceDots level={place.price_level} />}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
          {!previewMode && (
            <VoteButtons
              tripId={tripId}
              placeId={place.id}
              upvotes={voteSummary?.upvotes ?? 0}
              downvotes={voteSummary?.downvotes ?? 0}
              userVote={userVote}
              canVote={canVote}
              size="sm"
            />
          )}
        </div>
      </div>
    );
  }

  // Card View (Grid) - ALL SAME SIZE via h-full and min-h
  return (
    <div
      className={cn(
        'section-shell flex h-full flex-col cursor-pointer overflow-hidden',
        'hover:-translate-y-0.5 hover:shadow-lg transition-all',
        isNext && 'ring-2 ring-teal-500 ring-offset-2'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1.5"
        style={{ backgroundColor: category?.color ?? 'var(--color-primary)' }}
      />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Header: Clear Icon Indicator */}
        <div className="flex items-center justify-between gap-2">
          <div 
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg shadow-sm"
            style={{ backgroundColor: category?.color ? `${category.color}15` : 'var(--color-bg-muted)', color: category?.color ?? 'var(--color-primary)' }}
          >
            {category?.icon ?? <MapPin className="h-5 w-5" />}
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
             {isNext && (
              <div className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-bold text-teal-700 uppercase animate-pulse">
                <Navigation className="w-2.5 h-2.5" />
                Next
              </div>
            )}
             {category && <CategoryBadge category={category} size="xs" />}
          </div>
        </div>

        {/* Place name */}
        <div className="min-h-[2.2rem]">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-stone-800 tracking-tight">
            {place.name}
          </h3>

          {displayAddress && (
            <p className="flex items-start gap-1 text-[10px] leading-snug line-clamp-1 text-stone-400 mt-0.5">
              <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
              {displayAddress}
            </p>
          )}
        </div>

        {/* Rating + price */}
        {(place.rating != null || place.price_level != null) && (
          <div className="flex items-center gap-3">
            {place.rating != null && <StarRating rating={place.rating} />}
            {place.price_level != null && <PriceDots level={place.price_level} />}
          </div>
        )}

        {/* Note - User wants to see this */}
        {place.note && (
          <p className="flex items-start gap-1.5 text-[10px] text-amber-700 leading-snug line-clamp-2 italic bg-amber-50/50 p-1.5 rounded-lg border border-amber-100/50">
            <NotebookPen className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 opacity-70" />
            {place.note}
          </p>
        )}

        {/* Schedule - Full Date */}
        {!previewMode && hasSchedule && (
          <div
            className="flex items-center gap-2 flex-wrap rounded-lg border-l-2 px-2 py-1.5"
            style={{ backgroundColor: '#F0FDFA', borderLeftColor: '#0D9488' }}
          >
            {place.visit_date && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700">
                <CalendarDays className="w-3 h-3" />
                {new Date(place.visit_date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            )}
            <CheckInStatusBadge place={place} />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {!previewMode && (
          <div className="flex flex-col gap-2 border-t pt-2.5 mt-auto" style={{ borderColor: 'var(--color-border-muted)' }}>
            {/* Row 1: Maps */}
            <div onClick={(e) => e.stopPropagation()}>
              <PlaceMapLinks place={place} className="w-full justify-between sm:justify-start" />
            </div>

            {/* Row 2: Votes + Tag */}
            <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <VoteButtons
                tripId={tripId}
                placeId={place.id}
                upvotes={voteSummary?.upvotes ?? 0}
                downvotes={voteSummary?.downvotes ?? 0}
                userVote={userVote}
                canVote={canVote}
                size="sm"
              />

              {locationTags.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLocationTagClick?.(locationTags[0]);
                  }}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    cursor: onLocationTagClick ? 'pointer' : 'default',
                  }}
                >
                  <MapPin className="w-2.5 h-2.5" />
                  {locationTags[0]}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
