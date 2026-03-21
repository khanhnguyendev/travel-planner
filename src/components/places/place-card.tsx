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
  compact?: boolean;
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
            className={`w-3.5 h-3.5 ${filled ? 'fill-current' : ''}`}
            style={{ color: filled ? '#EAB308' : 'var(--color-border)' }}
          />
        );
      })}
      <span className="ml-1 text-xs font-medium text-stone-400">{rating.toFixed(1)}</span>
    </div>
  );
}

function PriceDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Price level: ${level} of 4`}>
      {Array.from({ length: 4 }, (_, i) => (
        <DollarSign
          key={i}
          className="w-3 h-3"
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
  compact = false,
}: PlaceCardProps) {
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

  return (
    <div
      className={cn(
        'section-shell flex flex-col cursor-pointer overflow-hidden',
        'hover:-translate-y-1 hover:shadow-xl transition-all',
        isNext && 'ring-2 ring-teal-500 ring-offset-2',
        compact && 'hover:-translate-y-0.5'
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

      <div className={cn("flex flex-1 flex-col gap-3", compact ? "p-3 gap-2" : "p-4 gap-3")}>
        {/* "Next stop" badge */}
        {isNext && (
          <div className="flex w-fit items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 animate-pulse">
            <Navigation className="w-3 h-3" />
            Next stop
          </div>
        )}

        {/* Category + location tags + trip tags */}
        {(category || locationTags.length > 0 || tags.length > 0) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {category && <CategoryBadge category={category} size="sm" />}
            {locationTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLocationTagClick?.(tag);
                }}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  cursor: onLocationTagClick ? 'pointer' : 'default',
                }}
                title={onLocationTagClick ? `Filter by ${tag}` : undefined}
              >
                <MapPin className="w-3 h-3" />
                {tag}
              </button>
            ))}
            {tags.map((name) => (
              <span
                key={name}
                className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-black/[0.02] sm:text-xs"
                style={{
                  borderColor: 'var(--color-primary-mid)',
                  color: 'var(--color-primary)',
                  backgroundColor: 'white'
                }}
              >
                #{name}
              </span>
            ))}
          </div>
        )}

        {/* Place name */}
        <div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-stone-800 section-title">
            {place.name}
          </h3>

          {displayAddress && (
            <p className="flex items-start gap-1 text-xs leading-snug line-clamp-1 text-stone-400 mt-1">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {displayAddress}
            </p>
          )}
        </div>

        {/* Rating + price */}
        {(place.rating != null || place.price_level != null) && (
          <div className="flex items-center gap-3 flex-wrap">
            {place.rating != null && <StarRating rating={place.rating} />}
            {place.price_level != null && <PriceDots level={place.price_level} />}
          </div>
        )}

        {/* Editorial summary */}
        {place.editorial_summary && !compact && (
          <p className="text-xs leading-relaxed line-clamp-2 text-stone-400">
            {place.editorial_summary}
          </p>
        )}

        {/* Note + comment previews */}
        {!previewMode && !compact && (place.note || comments.length > 0) && (
          <div className="flex flex-col gap-1">
            {place.note && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 leading-snug line-clamp-2">
                <NotebookPen className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-70" />
                {place.note}
              </p>
            )}
            {comments.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-stone-400 leading-snug line-clamp-1">
                <MessageCircle className="w-3 h-3 flex-shrink-0" />
                {comments.length === 1
                  ? comments[0].body
                  : `${comments.length} comments — ${comments[comments.length - 1].body}`}
              </p>
            )}
          </div>
        )}

        {!previewMode && placeExpenses.length > 0 && (
          <PlaceExpenseSummary expenses={placeExpenses} />
        )}

        {/* Schedule */}
        {!previewMode && hasSchedule && (
          <div
            className="flex items-center gap-2 flex-wrap rounded-[1rem] border-l-2 px-3 py-2"
            style={{ backgroundColor: '#F0FDFA', borderLeftColor: '#0D9488' }}
          >
            {place.visit_date && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date(place.visit_date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {(place.visit_time_from || place.visit_time_to) && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                <Clock className="w-3.5 h-3.5" />
                {place.visit_time_from ?? '?'} – {place.visit_time_to ?? '?'}
              </span>
            )}
            {place.backup_place_id && (
              <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                <ShieldAlert className="w-3 h-3" />
                Backup set
              </span>
            )}
            <CheckInStatusBadge place={place} />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {!previewMode && (
          <div
            className="space-y-2 border-t pt-2"
            style={{ borderColor: 'var(--color-border-muted)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <PlaceMapLinks place={place} />

            <VoteButtons
              tripId={tripId}
              placeId={place.id}
              upvotes={voteSummary?.upvotes ?? 0}
              downvotes={voteSummary?.downvotes ?? 0}
              userVote={userVote}
              canVote={canVote}
            />
          </div>
        )}
      </div>
    </div>
  );
}
