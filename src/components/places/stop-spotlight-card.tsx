'use client';

import { useState } from 'react';
import { ArrowLeftRight, Navigation, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { PlaceMapLinks } from '@/components/places/place-map-links';
import { CheckInOutButton } from '@/components/places/check-in-out-button';
import { SwapPlacePanel } from '@/components/places/swap-place-button';
import type { Place } from '@/lib/types';

interface StopSpotlightCardProps {
  label: string;
  place: Place | null;
  emptyLabel: string;
  tone: 'previous' | 'current' | 'next';
  canEdit: boolean;
  allDayPlaces: Place[];
  allPlaces: Place[];
  tripId: string;
}

function formatStopPlan(place: Place): string {
  const parts: string[] = [];
  if (place.visit_date) {
    parts.push(
      new Date(`${place.visit_date}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    );
  }
  if (place.visit_time_from || place.visit_time_to) {
    parts.push(`${place.visit_time_from ?? '?'} - ${place.visit_time_to ?? '?'}`);
  }
  if (place.checkout_date) {
    parts.push(`Checkout ${formatDate(place.checkout_date)}`);
  }
  return parts.length > 0 ? parts.join(' • ') : 'No schedule yet';
}

export function StopSpotlightCard({
  label,
  place,
  emptyLabel,
  tone,
  canEdit,
  allDayPlaces,
  allPlaces,
  tripId,
}: StopSpotlightCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const toneStyles: Record<'previous' | 'current' | 'next', { chipBg: string; chipText: string; panelBg: string }> = {
    previous: { chipBg: '#E2E8F0', chipText: '#475569', panelBg: 'rgba(255,255,255,0.72)' },
    current: { chipBg: '#CCFBF1', chipText: '#0F766E', panelBg: '#ECFDF5' },
    next: { chipBg: '#DBEAFE', chipText: '#1D4ED8', panelBg: '#EFF6FF' },
  };
  const styles = toneStyles[tone];

  return (
    <div className="group [perspective:1000px]">
      <div 
        className={cn(
          "relative transition-all duration-700 [transform-style:preserve-3d]",
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        {/* Front Face */}
        <div className="rounded-[1.5rem] bg-stone-950/[0.03] p-3.5 [backface-visibility:hidden]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{ backgroundColor: styles.chipBg, color: styles.chipText }}
              >
                {label}
              </div>
            </div>
            {canEdit && place && (
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 shadow-sm transition-all hover:bg-white hover:text-stone-700 hover:shadow-md active:scale-90"
                title="Swap place"
              >
                <ArrowLeftRight className="h-3 w-3" />
                Swap
              </button>
            )}
          </div>

          <div className="mt-3">
            <h3 className="text-lg font-semibold leading-tight section-title" style={{ color: 'var(--color-text)' }}>
              {place?.name ?? emptyLabel}
            </h3>
            <p className="mt-1 min-h-[2.2rem] text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
              {place?.address ?? (place ? 'Address not available yet.' : 'No scheduled place is mapped to this slot yet.')}
            </p>
          </div>

          <div className="mt-3 rounded-[1.2rem] px-3 py-3" style={{ backgroundColor: styles.panelBg }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Schedule plan
            </p>
            <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {place ? formatStopPlan(place) : 'No plan yet'}
            </p>
            {place?.visit_date && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Planned for {formatDate(place.visit_date)}
              </p>
            )}
          </div>

          {place && (
            <div className="mt-4 flex flex-col gap-3">
              {canEdit && (
                <CheckInOutButton
                  place={place}
                  allDayPlaces={allDayPlaces}
                  tripId={tripId}
                />
              )}
              <div className="pt-0.5 select-none">
                <PlaceMapLinks place={place} />
              </div>
            </div>
          )}
        </div>

        {/* Back Face (Swap Panel) */}
        <div 
          className="absolute inset-0 rounded-[1.5rem] bg-stone-100 p-3.5 shadow-xl border border-stone-200 [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          {place && (
            <SwapPlacePanel
              place={place}
              allPlaces={allPlaces}
              tripId={tripId}
              onClose={() => setIsFlipped(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
