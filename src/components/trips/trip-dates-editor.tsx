'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { updateTripDates } from '@/features/trips/actions';
import { useLoadingToast, useToast } from '@/components/ui/toast';

interface TripDatesEditorProps {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
  canManage: boolean;
}

export function TripDatesEditor({ tripId, startDate, endDate, canManage }: TripDatesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(startDate ?? '');
  const [end, setEnd] = useState(endDate ?? '');
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();
  const { showToast } = useToast();

  if (!canManage) return null;

  if (!editing) {
    return (
      <button
        onClick={() => { setStart(startDate ?? ''); setEnd(endDate ?? ''); setEditing(true); }}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors mt-2 cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
      >
        <Pencil className="w-3 h-3" />
        Edit dates
      </button>
    );
  }

  async function handleSave() {
    if (end && start && end < start) {
      showToast('End date must be after start date', 'error');
      return;
    }
    setPending(true);
    const resolve = loadingToast('Saving dates…');
    const result = await updateTripDates(tripId, start || null, end || null);
    setPending(false);
    if (result.ok) {
      resolve('Dates updated!', 'success');
      setEditing(false);
    } else {
      resolve(result.error, 'error');
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Start date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            max={end || undefined}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">End date</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            min={start || undefined}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <X className="w-3.5 h-3.5 inline mr-1" />
          Cancel
        </button>
      </div>
    </div>
  );
}
