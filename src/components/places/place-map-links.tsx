import { Map, Navigation } from 'lucide-react';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';

export function googleMapsUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`;
}

export function vietmapUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://maps.vietmap.vn/?q=${place.lat},${place.lng}`;
  }
  return `https://maps.vietmap.vn/?q=${encodeURIComponent(place.name)}`;
}

export function PlaceMapLinks({
  place,
  className,
}: {
  place: Place;
  className?: string;
}) {
  const baseClass = 'inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all hover:shadow-md active:scale-95';

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <a
        href={googleMapsUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          baseClass,
          'border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:bg-blue-100'
        )}
        title="Open in Google Maps"
      >
        <Map className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Google Maps</span>
        <span className="sm:hidden">Maps</span>
      </a>
      <a
        href={vietmapUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          baseClass,
          'border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100'
        )}
        title="Open in Vietmap"
      >
        <Navigation className="h-3.5 w-3.5" />
        Vietmap
      </a>
    </div>
  );
}
