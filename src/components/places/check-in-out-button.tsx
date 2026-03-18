'use client';

import { useState } from 'react';
import { LogIn, LogOut, Clock, X, RotateCcw } from 'lucide-react';
import { checkInPlace, checkOutPlace, cascadePlaceDelay, clearPlaceCheckin } from '@/features/places/actions';
import { useLoadingToast, useToast } from '@/components/ui/toast';
import type { Place } from '@/lib/types';

interface CheckInOutButtonProps {
  place: Place;
  allDayPlaces: Place[]; // all places on the same visit_date (for cascade count preview)
  tripId: string;
}

type Step = 'idle' | 'picking-checkin' | 'picking-checkout' | 'cascade-prompt';

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CheckInOutButton({ place, allDayPlaces, tripId }: CheckInOutButtonProps) {
  const isCheckedIn = Boolean(place.actual_checkin_at);
  const isCheckedOut = Boolean(place.actual_checkout_at);

  const [step, setStep] = useState<Step>('idle');
  const [datetimeValue, setDatetimeValue] = useState(() => toLocalDatetimeValue(new Date()));
  const [pendingDelay, setPendingDelay] = useState(0);
  const [pendingTs, setPendingTs] = useState('');
  const [loading, setLoading] = useState(false);

  const loadingToast = useLoadingToast();
  const { showToast } = useToast();

  function openCheckin() {
    setDatetimeValue(toLocalDatetimeValue(new Date()));
    setStep('picking-checkin');
  }

  function openCheckout() {
    setDatetimeValue(toLocalDatetimeValue(new Date()));
    setStep('picking-checkout');
  }

  async function submitCheckin(isoTs: string) {
    setLoading(true);
    const resolve = loadingToast('Checking in…');
    const result = await checkInPlace(place.id, isoTs);
    setLoading(false);

    if (!result.ok) {
      resolve(result.error, 'error');
      setStep('idle');
      return;
    }

    resolve('Checked in!', 'success');
    const { delayMinutes, downstreamCount } = result.data;

    if (delayMinutes > 0 && downstreamCount > 0) {
      setPendingDelay(delayMinutes);
      setPendingTs(isoTs);
      setStep('cascade-prompt');
    } else {
      setStep('idle');
    }
  }

  async function submitCheckout(isoTs: string) {
    setLoading(true);
    const resolve = loadingToast('Checking out…');
    const result = await checkOutPlace(place.id, isoTs);
    setLoading(false);
    if (result.ok) {
      resolve('Checked out!', 'success');
    } else {
      resolve(result.error, 'error');
    }
    setStep('idle');
  }

  async function applyCascade() {
    setLoading(true);
    const resolve = loadingToast(`Shifting downstream stops by ${pendingDelay} min…`);
    const result = await cascadePlaceDelay(tripId, place.id, pendingDelay);
    setLoading(false);
    if (result.ok) {
      resolve('Schedule updated', 'success');
    } else {
      resolve(result.error, 'error');
    }
    setStep('idle');
  }

  async function handleClear() {
    if (!confirm('Clear check-in and check-out times for this place?')) return;
    setLoading(true);
    const resolve = loadingToast('Clearing…');
    const result = await clearPlaceCheckin(place.id);
    setLoading(false);
    if (result.ok) {
      resolve('Check-in cleared', 'success');
    } else {
      resolve(result.error, 'error');
    }
  }

  // Downstream count for cascade prompt label
  const downstreamCount = allDayPlaces.filter(
    (p) => p.id !== place.id &&
      p.visit_time_from &&
      place.visit_time_from &&
      p.visit_time_from > place.visit_time_from
  ).length;

  // ── Cascade confirmation ──────────────────────────────
  if (step === 'cascade-prompt') {
    return (
      <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-3 space-y-3">
        <p className="text-sm font-semibold text-amber-800">
          You checked in {pendingDelay} min late
        </p>
        <p className="text-xs text-amber-700">
          Shift {downstreamCount} downstream stop{downstreamCount !== 1 ? 's' : ''} by {pendingDelay} min?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyCascade}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            Apply shift
          </button>
          <button
            type="button"
            onClick={() => setStep('idle')}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center rounded-full border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Time picker panel ─────────────────────────────────
  if (step === 'picking-checkin' || step === 'picking-checkout') {
    const isIn = step === 'picking-checkin';
    return (
      <div className="rounded-[1.2rem] border border-stone-200 bg-stone-50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-stone-600">
            {isIn ? 'Check-in time' : 'Check-out time'}
          </p>
          <button
            type="button"
            onClick={() => setStep('idle')}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Now button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            const now = new Date().toISOString();
            if (isIn) submitCheckin(now);
            else submitCheckout(now);
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Clock className="w-4 h-4" />
          Now
        </button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400">or pick time</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={datetimeValue}
            onChange={(e) => setDatetimeValue(e.target.value)}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="button"
            disabled={loading || !datetimeValue}
            onClick={() => {
              const iso = new Date(datetimeValue).toISOString();
              if (isIn) submitCheckin(iso);
              else submitCheckout(iso);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  // ── Default idle buttons ──────────────────────────────
  return (
    <div className="flex flex-wrap gap-2">
      {!isCheckedIn && (
        <button
          type="button"
          onClick={openCheckin}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <LogIn className="h-4 w-4" />
          Check in
        </button>
      )}

      {isCheckedIn && !isCheckedOut && (
        <>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Checked in {place.actual_checkin_at
              ? new Date(place.actual_checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </div>
          <button
            type="button"
            onClick={openCheckout}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:bg-stone-100"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <LogOut className="h-4 w-4" />
            Check out
          </button>
        </>
      )}

      {isCheckedOut && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600">
          ✓ Done · {place.actual_checkin_at
            ? new Date(place.actual_checkin_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '?'}
          {' → '}
          {place.actual_checkout_at
            ? new Date(place.actual_checkout_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '?'}
        </div>
      )}

      {(isCheckedIn || isCheckedOut) && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-2 text-xs text-stone-400 hover:text-red-500 hover:border-red-200 transition-colors"
          style={{ borderColor: 'var(--color-border)' }}
          title="Clear check-in"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// Lightweight read-only status badge for use on cards
export function CheckInStatusBadge({ place }: { place: Place }) {
  if (place.actual_checkout_at) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
        ✓ Done
      </span>
    );
  }
  if (place.actual_checkin_at) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
        Here now
      </span>
    );
  }
  return null;
}
