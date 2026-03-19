'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { updateTripDates } from '@/features/trips/actions';
import { useLoadingToast, useToast } from '@/components/ui/toast';

interface TripDatesEditorProps {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
  canManage: boolean;
  field: 'start' | 'end';
}

export function TripDatesEditor({ tripId, startDate, endDate, canManage, field }: TripDatesEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field === 'start' ? (startDate ?? '') : (endDate ?? ''));
  const [pending, setPending] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const { showToast } = useToast();

  if (!canManage) return null;

  async function handleSave() {
    const nextStart = field === 'start' ? value : (startDate ?? '');
    const nextEnd = field === 'end' ? value : (endDate ?? '');

    if (nextEnd && nextStart && nextEnd < nextStart) {
      showToast('End date must be after start date', 'error');
      return;
    }
    setPending(true);
    const resolve = loadingToast('Saving dates…');
    const result = await updateTripDates(tripId, nextStart || null, nextEnd || null);
    setPending(false);
    if (result.ok) {
      resolve('Dates updated!', 'success');
      setEditing(false);
      startRefreshTransition(() => {
        router.refresh();
      });
    } else {
      resolve(result.error, 'error');
    }
  }

  return (
    <div className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          setValue(field === 'start' ? (startDate ?? '') : (endDate ?? ''));
          setEditing(true);
        }}
        disabled={pending || isRefreshing}
        className="rounded p-1 transition-colors hover:bg-black/5 cursor-pointer"
        title={field === 'start' ? 'Edit start date' : 'Edit end date'}
        aria-label={field === 'start' ? 'Edit start date' : 'Edit end date'}
      >
        {isRefreshing ? (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
        ) : (
          <Pencil className="w-3 h-3" style={{ color: 'var(--color-text-subtle)' }} />
        )}
      </button>

      {editing && (
        <div className="absolute right-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-stone-200 bg-stone-50 p-3 shadow-lg">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              {field === 'start' ? 'From date' : 'To date'}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              max={field === 'start' ? (endDate || undefined) : undefined}
              min={field === 'end' ? (startDate || undefined) : undefined}
              className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-100"
            >
              <X className="mr-1 inline h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
