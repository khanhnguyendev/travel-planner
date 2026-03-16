'use client';

import { useEffect, useRef } from 'react';
import { X, MapPin, Star, DollarSign, ExternalLink } from 'lucide-react';
import type { Place, PlaceReview, Category, PlaceVote } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlaceDetailDrawerProps {
  place: Place;
  reviews: PlaceReview[];
  category: Category | null;
  projectId: string;
  voteSummary: VoteSummaryEntry | null;
  userVote: PlaceVote | null;
  onClose: () => void;
}

function StarFull({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-current' : ''}`}
          style={{
            color: i < Math.round(rating) ? '#EAB308' : 'var(--color-border)',
          }}
        />
      ))}
      <span className="ml-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 4 }, (_, i) => (
        <DollarSign
          key={i}
          className="w-4 h-4"
          style={{
            color: i < level ? 'var(--color-secondary)' : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {review.author_name ?? 'Anonymous'}
          </p>
          {review.published_at && (
            <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              {new Date(review.published_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>
        {review.rating != null && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: review.rating }, (_, i) => (
              <Star key={i} className="w-3 h-3 fill-current" style={{ color: '#EAB308' }} />
            ))}
          </div>
        )}
      </div>
      {review.text && (
        <p
          className="text-sm leading-relaxed line-clamp-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {review.text}
        </p>
      )}
    </div>
  );
}

export function PlaceDetailDrawer({
  place,
  reviews,
  category,
  projectId,
  voteSummary,
  userVote,
  onClose,
}: PlaceDetailDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — full-screen on mobile, side panel on md+ */}
      <aside
        className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 z-50 md:w-full md:max-w-md flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg)' }}
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex-1 min-w-0 pr-3">
            {category && (
              <div className="mb-2">
                <CategoryBadge category={category} size="sm" />
              </div>
            )}
            <h2
              className="text-xl font-bold leading-snug text-stone-800"
            >
              {place.name}
            </h2>
            {place.address && (
              <p
                className="flex items-start gap-1 text-sm mt-1 text-stone-600"
              >
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {place.address}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors flex-shrink-0 hover:bg-stone-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Rating + price */}
          {(place.rating != null || place.price_level != null) && (
            <div className="flex items-center gap-4 flex-wrap">
              {place.rating != null && <StarFull rating={place.rating} />}
              {place.price_level != null && (
                <PriceLevel level={place.price_level} />
              )}
            </div>
          )}

          {/* Editorial summary */}
          {place.editorial_summary && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-2 text-stone-400"
              >
                About
              </h3>
              <p
                className="text-sm leading-relaxed text-stone-600"
              >
                {place.editorial_summary}
              </p>
            </div>
          )}

          {/* Votes */}
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400"
            >
              Your vote
            </h3>
            <VoteButtons
              projectId={projectId}
              placeId={place.id}
              upvotes={voteSummary?.upvotes ?? 0}
              downvotes={voteSummary?.downvotes ?? 0}
              userVote={userVote}
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h3
                className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400"
              >
                Reviews from Google
              </h3>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
              <p className="text-xs mt-3 text-stone-400">
                Reviews sourced from Google Maps.
              </p>
            </div>
          )}

          {/* Source link */}
          {place.source_url && (
            <a
              href={place.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm min-h-[44px]"
              style={{ color: 'var(--color-primary)' }}
            >
              <ExternalLink className="w-4 h-4" />
              View on Google Maps
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
