'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RefreshOverlay } from '@/components/ui/refresh-overlay';

import { TRIP_SECTION_REFRESH_EVENT } from '@/components/trips/trip-refresh-keys';

interface TripSectionRefreshDetail {
  tripId: string;
  sections: string[];
}

interface UseTripSectionRefreshOptions {
  tripId: string;
  sections: string | string[];
  signature: string;
}

interface TripSectionRefreshBoundaryProps extends UseTripSectionRefreshOptions {
  label?: string;
  children: ReactNode;
  className?: string;
}

function normalizeSections(sections: string | string[]) {
  return Array.isArray(sections) ? sections : [sections];
}

function matchesRefreshTarget(targets: string[], incoming: string[]) {
  if (incoming.includes('all')) return true;
  return targets.some((target) => incoming.includes(target));
}

export function emitTripSectionRefresh(tripId: string, sections: string | string[]) {
  if (typeof window === 'undefined') return;

  const detail: TripSectionRefreshDetail = {
    tripId,
    sections: normalizeSections(sections),
  };

  window.dispatchEvent(new CustomEvent<TripSectionRefreshDetail>(TRIP_SECTION_REFRESH_EVENT, { detail }));
}

export function useTripSectionRefresh({
  tripId,
  sections,
  signature,
}: UseTripSectionRefreshOptions) {
  const targets = normalizeSections(sections);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isRefreshing = pendingSignature === signature;

  useEffect(() => {
    function handleRefresh(event: Event) {
      const detail = (event as CustomEvent<TripSectionRefreshDetail>).detail;
      if (!detail || detail.tripId !== tripId) return;
      if (!matchesRefreshTarget(targets, detail.sections)) return;

      const activeSignature = signature;
      setPendingSignature(activeSignature);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setPendingSignature((current) => (current === activeSignature ? null : current));
      }, 5000);
    }

    window.addEventListener(TRIP_SECTION_REFRESH_EVENT, handleRefresh as EventListener);
    return () => {
      window.removeEventListener(TRIP_SECTION_REFRESH_EVENT, handleRefresh as EventListener);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [signature, targets, tripId]);

  return isRefreshing;
}

export function TripSectionRefreshBoundary({
  tripId,
  sections,
  signature,
  label = 'Refreshing',
  children,
  className,
}: TripSectionRefreshBoundaryProps) {
  const isRefreshing = useTripSectionRefresh({ tripId, sections, signature });

  return (
    <div className={className ? `relative ${className}` : 'relative'}>
      {children}
      {isRefreshing && <RefreshOverlay label={label} />}
    </div>
  );
}
