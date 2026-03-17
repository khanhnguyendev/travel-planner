import { Star, MapPin, DollarSign, Clock, ShieldAlert, CalendarDays, Navigation, Map } from 'lucide-react';
import type { Place, Category, PlaceVote } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { cn } from '@/lib/utils';

interface PlaceCardProps {
  place: Place;
  category: Category | null;
  projectId: string;
  voteSummary: VoteSummaryEntry | null;
  userVote: PlaceVote | null;
  isNext?: boolean;
  onClick?: () => void;
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

/** Extract a short location tag from the address.
 *  e.g. "123 Phố Huế, Hai Bà Trưng, Hà Nội, Việt Nam" → "Hà Nội"
 */
function extractLocationTag(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  // Skip last part if it looks like a country name (length > 2 chars and mostly letters)
  const last = parts[parts.length - 1];
  const isCountry = /^[A-Za-zÀ-ỹ\s.]+$/.test(last) && last.length > 3;
  return isCountry ? (parts[parts.length - 2] ?? null) : last;
}

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
  projectId,
  voteSummary,
  userVote,
  isNext = false,
  onClick,
}: PlaceCardProps) {
  const locationTag = place.address ? extractLocationTag(place.address) : null;
  const hasSchedule = place.visit_date || place.visit_time_from;

  return (
    <div
      className={cn(
        'card flex flex-col cursor-pointer',
        'hover:scale-[1.02] hover:shadow-md transition-all',
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
        className="h-1.5 rounded-t-2xl"
        style={{ backgroundColor: category?.color ?? 'var(--color-primary)' }}
      />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* "Next stop" badge */}
        {isNext && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full w-fit animate-pulse">
            <Navigation className="w-3 h-3" />
            Next stop
          </div>
        )}

        {/* Category badge */}
        {category && (
          <div>
            <CategoryBadge category={category} size="sm" />
          </div>
        )}

        {/* Place name */}
        <div>
          <h3 className="font-semibold text-base leading-snug line-clamp-2 text-stone-800">
            {place.name}
          </h3>

          <div className="flex items-start gap-2 mt-1 flex-wrap">
            {place.address && (
              <p className="flex items-start gap-1 text-xs leading-snug line-clamp-1 text-stone-400 flex-1 min-w-0">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {place.address}
              </p>
            )}
            {locationTag && (
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex-shrink-0 whitespace-nowrap">
                {locationTag}
              </span>
            )}
          </div>
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

        {/* Schedule */}
        {hasSchedule && (
          <div
            className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-subtle)' }}
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
              Google Maps
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
            projectId={projectId}
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
