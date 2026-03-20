'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, X, Search, CalendarDays, Clock } from 'lucide-react';
import { swapPlaceSchedules } from '@/features/places/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import type { Place } from '@/lib/types';

interface SwapPlaceButtonProps {
  place: Place;       // the place being replaced
  allPlaces: Place[]; // all other places in the trip to pick from
  tripId: string;
  affectsStops?: boolean;
}

function formatScheduleLabel(p: Place): string {
  if (!p.visit_date && !p.visit_time_from) return 'Unscheduled';
  const parts: string[] = [];
  if (p.visit_date) {
    parts.push(new Date(`${p.visit_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  }
  if (p.visit_time_from) {
    parts.push(p.visit_time_from + (p.visit_time_to ? ` – ${p.visit_time_to}` : ''));
  }
  return parts.join(' · ');
}

export interface SwapPlacePanelProps {
  place: Place;
  allPlaces: Place[];
  tripId: string;
  onClose: () => void;
  affectsStops?: boolean;
}

export function SwapPlacePanel({
  place,
  allPlaces,
  tripId,
  onClose,
  affectsStops = true,
}: SwapPlacePanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const candidates = allPlaces
    .filter((p) => p.id !== place.id)
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const aScheduled = a.visit_date || a.visit_time_from ? 1 : 0;
      const bScheduled = b.visit_date || b.visit_time_from ? 1 : 0;
      if (bScheduled !== aScheduled) return bScheduled - aScheduled;
      const aKey = `${a.visit_date ?? 'zzz'}-${a.visit_time_from ?? '99:99'}`;
      const bKey = `${b.visit_date ?? 'zzz'}-${b.visit_time_from ?? '99:99'}`;
      return aKey.localeCompare(bKey);
    });

  function refreshSurfaces() {
    emitTripSectionRefresh(tripId, [
      TRIP_REFRESH_SECTIONS.placeDetail,
      TRIP_REFRESH_SECTIONS.places,
      TRIP_REFRESH_SECTIONS.timeline,
      TRIP_REFRESH_SECTIONS.map,
      TRIP_REFRESH_SECTIONS.activity,
      ...(affectsStops ? [TRIP_REFRESH_SECTIONS.stops] : []),
    ]);
    startRefreshTransition(() => router.refresh());
  }

  async function handleSelect(targetId: string, targetName: string) {
    setLoading(true);
    const resolve = loadingToast(`Swapping to ${targetName}…`);
    const result = await swapPlaceSchedules(place.id, targetId);
    setLoading(false);
    if (result.ok) {
      resolve('Schedule swapped!', 'success');
      onClose();
      refreshSurfaces();
    } else {
      resolve(result.error ?? 'Failed to swap', 'error');
    }
  }

  return (
    <div className="flex h-full flex-col space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Replace with
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-stone-400" />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places…"
          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Place list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {candidates.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-400">
            No places found
          </p>
        ) : (
          candidates.map((p) => {
            const isScheduled = Boolean(p.visit_date || p.visit_time_from);
            return (
              <button
                key={p.id}
                type="button"
                disabled={loading}
                onClick={() => handleSelect(p.id, p.name)}
                className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition-all hover:bg-white hover:shadow-sm disabled:opacity-50"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isScheduled ? (
                    <CalendarDays className="h-3.5 w-3.5 text-teal-500" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-stone-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-stone-900">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    {formatScheduleLabel(p)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function SwapPlaceButton({ place, allPlaces, tripId, affectsStops = true }: SwapPlaceButtonProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all hover:shadow-sm"
        style={{
          borderColor: 'rgba(120, 113, 108, 0.2)',
          backgroundColor: 'rgba(245, 245, 244, 0.4)',
          color: 'var(--color-text-muted)',
        }}
      >
        <ArrowLeftRight className="h-3.5 w-3.5 opacity-70" />
        Swap place
      </button>
    );
  }

  return (
    <div className="mt-1 min-h-[200px] rounded-xl border border-stone-200 bg-stone-50 p-3 shadow-sm">
      <SwapPlacePanel
        place={place}
        allPlaces={allPlaces}
        tripId={tripId}
        onClose={() => setOpen(false)}
        affectsStops={affectsStops}
      />
    </div>
  );
}
