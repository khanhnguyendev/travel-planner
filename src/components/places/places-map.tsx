'use client';

import dynamic from 'next/dynamic';
import type { Place, Category } from '@/lib/types';

// Lazy-load the actual Leaflet map (SSR: false)
const LeafletMap = dynamic(() => import('./leaflet-map'), { ssr: false });

interface PlacesMapProps {
  places: Place[];
  categories: Category[];
  onPlaceClick: (place: Place) => void;
}

export function PlacesMap({ places, categories, onPlaceClick }: PlacesMapProps) {
  const withCoords = places.filter((p) => p.lat != null && p.lng != null);
  const withoutCoords = places.length - withCoords.length;

  if (withCoords.length === 0) {
    return (
      <div
        className="flex h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl sm:h-[400px]"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          No places with location data
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2 overflow-hidden">
      <div className="h-[340px] overflow-hidden rounded-2xl sm:h-[400px]">
        <LeafletMap places={withCoords} categories={categories} onPlaceClick={onPlaceClick} />
      </div>
      {withoutCoords > 0 && (
        <p className="text-xs px-1" style={{ color: 'var(--color-text-subtle)' }}>
          {withoutCoords} {withoutCoords === 1 ? 'place' : 'places'} not on map
        </p>
      )}
    </div>
  );
}
