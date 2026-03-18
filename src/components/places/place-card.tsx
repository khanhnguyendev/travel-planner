import { Star, MapPin, DollarSign, Clock, ShieldAlert, CalendarDays, Navigation, Map, MessageCircle, NotebookPen } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceComment } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { cn } from '@/lib/utils';
import { extractLocationTag } from '@/lib/address';

interface PlaceCardProps {
  place: Place;
  category: Category | null;
  tripId: string;
  voteSummary: VoteSummaryEntry | null;
  userVote: PlaceVote | null;
  comments?: PlaceComment[];
  isNext?: boolean;
  onClick?: () => void;
  onLocationTagClick?: (tag: string) => void;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100" aria-label={`Rating: ${rating}`}>
      <div className="flex items-center -gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < full || (i === full && hasHalf);
          return (
            <Star
              key={i}
              className={cn("w-3 h-3", filled ? "fill-amber-400 text-amber-400" : "text-amber-200")}
            />
          );
        })}
      </div>
      <span className="text-[10px] font-bold text-amber-700">{rating.toFixed(1)}</span>
    </div>
  );
}

function PriceDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5 bg-secondary/5 px-2 py-0.5 rounded-lg border border-secondary/10" aria-label={`Price level: ${level} of 4`}>
      {Array.from({ length: 4 }, (_, i) => (
        <DollarSign
          key={i}
          className={cn("w-3 h-3", i < level ? "text-secondary opacity-100" : "text-secondary/20")}
        />
      ))}
    </div>
  );
}

export { extractLocationTag } from '@/lib/address';

function googleMapsUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`;
}

function vietmapUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://maps.vietmap.vn/?q=${place.lat},${place.lng}`;
  }
  return `https://maps.vietmap.vn/?q=${encodeURIComponent(place.name)}`;
}

export function PlaceCard({
  place,
  category,
  tripId,
  voteSummary,
  userVote,
  comments = [],
  isNext = false,
  onClick,
  onLocationTagClick,
}: PlaceCardProps) {
  const hasSchedule = place.visit_date || place.visit_time_from;
  const locationTag = place.address ? extractLocationTag(place.address) : null;

  return (
    <div
      className={cn(
        'card-premium group flex flex-col cursor-pointer overflow-hidden',
        isNext && 'ring-4 ring-primary/20 bg-primary/5'
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
        className="h-2 w-full transition-all group-hover:h-3"
        style={{ backgroundColor: category?.color ?? 'var(--color-primary)' }}
      />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* "Next stop" badge */}
        {isNext && (
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-xl w-fit animate-pulse border border-primary/20">
            <Navigation className="w-3.5 h-3.5 fill-current" />
            Next Stop
          </div>
        )}

        {/* Category + location tags */}
        {(category || locationTag) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {category && <CategoryBadge category={category} size="sm" />}
            {locationTag && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLocationTagClick?.(locationTag);
                }}
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  cursor: onLocationTagClick ? 'pointer' : 'default',
                }}
                title={onLocationTagClick ? `Filter by ${locationTag}` : undefined}
              >
                {locationTag}
              </button>
            )}
          </div>
        )}

        {/* Place name */}
        <div>
          <h3 className="font-display font-bold text-lg leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {place.name}
          </h3>

          {place.address && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground mt-2 font-medium">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary/60" />
              {place.address}
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
        {place.editorial_summary && (
          <p className="text-xs leading-relaxed line-clamp-2 text-stone-400">
            {place.editorial_summary}
          </p>
        )}

        {/* Note + comment previews */}
        {(place.note || comments.length > 0) && (
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

        {/* Schedule */}
        {hasSchedule && (
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
            <div className="flex items-center gap-3 flex-wrap">
              {place.visit_date && (
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(place.visit_date + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
              {(place.visit_time_from || place.visit_time_to) && (
                <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  <Clock className="w-3.5 h-3.5" />
                  {place.visit_time_from ?? '?'} – {place.visit_time_to ?? '?'}
                </span>
              )}
            </div>
            {place.backup_place_id && (
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 w-fit">
                <ShieldAlert className="w-3.5 h-3.5" />
                Backup Option
              </div>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Map buttons + Votes */}
        <div
          className="pt-2 border-t space-y-2"
          style={{ borderColor: 'var(--color-border-muted)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Map links */}
          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
              title="Open in Google Maps"
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Maps</span>
              <span className="sm:hidden">Maps</span>
            </a>
            <a
              href={vietmapUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
              title="Open in Vietmap"
            >
              <Navigation className="w-3.5 h-3.5" />
              Vietmap
            </a>
          </div>

          {/* Votes */}
          <VoteButtons
            tripId={tripId}
            placeId={place.id}
            upvotes={voteSummary?.upvotes ?? 0}
            downvotes={voteSummary?.downvotes ?? 0}
            userVote={userVote}
          />
        </div>
      </div>
    </div>
  );
}
