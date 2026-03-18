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
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <a
        href={googleMapsUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
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
        className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
        title="Open in Vietmap"
      >
        <Navigation className="h-3.5 w-3.5" />
        Vietmap
      </a>
    </div>
  );
}
