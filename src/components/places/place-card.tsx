import { useMemo } from 'react';
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
  const locationTags: string[] = useMemo(() => {
    if (!meta) {
      return place.address ? [extractLocationTag(place.address)].filter(Boolean) as string[] : [];
    }
    const tags: string[] = [];
    if (meta.place) tags.push(meta.place);
    if (meta.region && meta.region !== meta.place) tags.push(meta.region);
    if (meta.country && !tags.includes(meta.country)) tags.push(meta.country);
    return tags;
  }, [meta, place.address]);

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
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Header: Category Badge + Location Context */}
        <div className="flex flex-wrap items-center gap-2">
          {category && <CategoryBadge category={category} size="sm" />}
          {locationTags.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-100/50">
              <MapPin className="h-3.5 w-3.5" />
              <span>{locationTags[0]}</span>
            </div>
          )}
        </div>

        {/* Place name & Address */}
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-stone-800 tracking-tight">
            {place.name}
          </h3>

          {displayAddress && (
            <p className="flex items-start gap-1 text-xs leading-snug line-clamp-1 text-stone-400">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {displayAddress}
            </p>
          )}
        </div>

        {/* Schedule: Teal Pill Style */}
        {!previewMode && hasSchedule && (
          <div
            className="flex items-center gap-3 rounded-full border-2 border-teal-200 bg-teal-50 px-5 py-3 shadow-sm shadow-teal-900/5"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold text-teal-800">
              <CalendarDays className="h-4.5 w-4.5" />
              <span>
                {new Date(place.visit_date + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>
            {place.visit_time_from && (
              <div className="flex items-center gap-2 border-l-2 border-teal-200/50 pl-3.5 text-xs font-extrabold text-teal-800">
                <Clock className="h-4.5 w-4.5" />
                <span>
                  {place.visit_time_from} {place.visit_time_to ? `– ${place.visit_time_to}` : '– ?'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Note - Stylized for clarity */}
        {place.note && (
          <div className="flex flex-col gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm border-l-4 border-l-amber-400">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700/70">
              <NotebookPen className="w-3.5 h-3.5" />
              Note
            </div>
            <p className="text-[13px] text-stone-700 leading-relaxed italic line-clamp-3">
              {place.note}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {!previewMode && (
          <div className="flex flex-col gap-3">
            {/* Row 1: Maps */}
            <div onClick={(e) => e.stopPropagation()}>
              <PlaceMapLinks place={place} className="w-full justify-start" />
            </div>

            {/* Row 2: Votes (Left) + Trip Tags (Right) */}
            <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
              <VoteButtons
                tripId={tripId}
                placeId={place.id}
                upvotes={voteSummary?.upvotes ?? 0}
                downvotes={voteSummary?.downvotes ?? 0}
                userVote={userVote}
                canVote={canVote}
                size="md"
              />

              {tags.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-1 px-1">
                  {tags.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-0.5 rounded-full border border-teal-100 bg-white px-2.5 py-1 text-[11px] font-bold text-teal-600 shadow-sm"
                    >
                      <span className="opacity-70">#</span>
                      {name.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
