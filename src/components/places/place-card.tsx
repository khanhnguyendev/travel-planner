import { Star, MapPin, DollarSign } from 'lucide-react';
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
      <span
        className="ml-1 text-xs font-medium text-stone-400"
      >
        {rating.toFixed(1)}
      </span>
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
          style={{
            color:
              i < level ? 'var(--color-secondary)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}

export function PlaceCard({
  place,
  category,
  projectId,
  voteSummary,
  userVote,
  onClick,
}: PlaceCardProps) {
  return (
    <div
      className={cn(
        'card card-hover flex flex-col cursor-pointer',
        'hover:scale-[1.02] hover:shadow-md transition-all'
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
      {/* Card header accent */}
      <div
        className="h-1.5 rounded-t-2xl"
        style={{
          backgroundColor: category?.color ?? 'var(--color-primary)',
        }}
      />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Category badge */}
        {category && (
          <div>
            <CategoryBadge category={category} size="sm" />
          </div>
        )}

        {/* Place name */}
        <div>
          <h3
            className="font-semibold text-base leading-snug line-clamp-2 text-stone-800"
          >
            {place.name}
          </h3>

          {place.address && (
            <p
              className="flex items-start gap-1 text-xs mt-1 leading-snug line-clamp-2 text-stone-400"
            >
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {place.address}
            </p>
          )}
        </div>

        {/* Rating + price */}
        {(place.rating != null || place.price_level != null) && (
          <div className="flex items-center gap-3 flex-wrap">
            {place.rating != null && <StarRating rating={place.rating} />}
            {place.price_level != null && (
              <PriceDots level={place.price_level} />
            )}
          </div>
        )}

        {/* Editorial summary preview */}
        {place.editorial_summary && (
          <p
            className="text-xs leading-relaxed line-clamp-2 text-stone-400"
          >
            {place.editorial_summary}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Votes — stop propagation so clicks don't open drawer */}
        <div
          className="pt-2 border-t"
          style={{ borderColor: 'var(--color-border-muted)' }}
          onClick={(e) => e.stopPropagation()}
        >
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
