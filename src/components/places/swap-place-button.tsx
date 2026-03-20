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

export function SwapPlaceButton({ place, allPlaces, tripId, affectsStops = true }: SwapPlaceButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search when panel opens
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const candidates = allPlaces
    .filter((p) => p.id !== place.id)
    .filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      // Scheduled first
      const aScheduled = a.visit_date || a.visit_time_from ? 1 : 0;
      const bScheduled = b.visit_date || b.visit_time_from ? 1 : 0;
      if (bScheduled !== aScheduled) return bScheduled - aScheduled;
      // Then by date/time
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
      setOpen(false);
      setQuery('');
      refreshSurfaces();
    } else {
      resolve(result.error ?? 'Failed to swap', 'error');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all hover:shadow-sm"
        style={{
          borderColor: 'rgba(120, 113, 108, 0.2)', // stone-200/60 variant
          backgroundColor: 'rgba(245, 245, 244, 0.4)', // stone-100/40 variant
          color: 'var(--color-text-muted)',
        }}
      >
        <ArrowLeftRight className="w-3.5 h-3.5 opacity-70" />
        Swap place
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          Replace with…
        </p>
        <button
          type="button"
          onClick={() => { setOpen(false); setQuery(''); }}
          className="rounded-lg p-1 hover:bg-stone-200 transition-colors"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: 'var(--color-text-subtle)' }} />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places…"
          className="w-full rounded-lg border py-1.5 pl-7 pr-2.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
        />
      </div>

      {/* Place list */}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {candidates.length === 0 ? (
          <p className="py-2 text-center text-xs" style={{ color: 'var(--color-text-subtle)' }}>
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
                className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white disabled:opacity-50"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isScheduled
                    ? <CalendarDays className="w-3 h-3 text-teal-500" />
                    : <Clock className="w-3 h-3 text-stone-300" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                    {p.name}
                  </p>
                  <p className="text-[10px]" style={{ color: isScheduled ? '#0F766E' : 'var(--color-text-subtle)' }}>
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
