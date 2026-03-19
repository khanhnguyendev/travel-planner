'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Receipt, Plus, Trash2, CheckSquare, X } from 'lucide-react';
import { deleteExpense } from '@/features/expenses/actions';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { useLoadingToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { ExpenseSummaryCard } from '@/components/expenses/expense-summary-card';

interface ExpenseListProps {
  expenses: ExpenseWithSplits[];
  tripId: string;
  placeNameById?: Record<string, string>;
  canEdit?: boolean;
}

export function ExpenseList({ expenses: initialExpenses, tripId, placeNameById = {}, canEdit }: ExpenseListProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState(initialExpenses);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const loadingToast = useLoadingToast();

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this expense?')) return;
    setDeleting((prev) => new Set(prev).add(id));
    const resolve = loadingToast('Removing expense…');
    const result = await deleteExpense(id);
    setDeleting((prev) => { const next = new Set(prev); next.delete(id); return next; });
    if (result.ok) {
      resolve('Expense removed', 'success');
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      emitTripSectionRefresh(tripId, [
        TRIP_REFRESH_SECTIONS.budget,
        TRIP_REFRESH_SECTIONS.crew,
        TRIP_REFRESH_SECTIONS.expenses,
        TRIP_REFRESH_SECTIONS.activity,
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.map,
      ]);
      router.refresh();
    } else {
      resolve(result.error, 'error');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} expense${selectedIds.size > 1 ? 's' : ''}?`)) return;
    const resolve = loadingToast(`Removing ${selectedIds.size} expenses…`);
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map((id) => deleteExpense(id)));
    const failed = results.filter((r) => !r.ok).length;
    if (failed === 0) {
      resolve('Expenses removed', 'success');
      const deleted = new Set(ids);
      setExpenses((prev) => prev.filter((e) => !deleted.has(e.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      emitTripSectionRefresh(tripId, [
        TRIP_REFRESH_SECTIONS.budget,
        TRIP_REFRESH_SECTIONS.crew,
        TRIP_REFRESH_SECTIONS.expenses,
        TRIP_REFRESH_SECTIONS.activity,
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.map,
      ]);
      router.refresh();
    } else {
      resolve(`${failed} failed to delete`, 'error');
      const succeeded = ids.filter((_, i) => results[i].ok);
      setExpenses((prev) => prev.filter((e) => !succeeded.includes(e.id)));
      setSelectedIds((prev) => { const next = new Set(prev); succeeded.forEach((id) => next.delete(id)); return next; });
      if (succeeded.length > 0) {
        emitTripSectionRefresh(tripId, [
          TRIP_REFRESH_SECTIONS.budget,
          TRIP_REFRESH_SECTIONS.crew,
          TRIP_REFRESH_SECTIONS.expenses,
          TRIP_REFRESH_SECTIONS.activity,
          TRIP_REFRESH_SECTIONS.places,
          TRIP_REFRESH_SECTIONS.timeline,
          TRIP_REFRESH_SECTIONS.map,
        ]);
        router.refresh();
      }
    }
  }

  if (expenses.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <Receipt className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h3 className="font-semibold text-base mb-1 text-stone-800">
          Track your first shared expense
        </h3>
        <p className="text-sm max-w-xs mb-5 text-stone-600">
          Add expenses to keep everyone on the same page about shared costs for this trip.
        </p>
        {canEdit && (
          <Link
            href={`/trips/${tripId}/expenses/new`}
            className="btn-primary inline-flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add expense
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk select toolbar */}
      {canEdit && (
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
              className="inline-flex items-center gap-1.5 rounded-[1rem] border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.03]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </button>
          ) : (
            <>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
                className="inline-flex items-center gap-1.5 rounded-[1rem] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
              <button
                onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}
                className="inline-flex items-center gap-1.5 rounded-[1rem] border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.03]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-2">
        {expenses.map((expense) => {
          const isSelected = selectedIds.has(expense.id);
          const isDeleting = deleting.has(expense.id);

          return (
            <div key={expense.id} className="group relative flex items-stretch gap-2">
              {/* Checkbox in select mode */}
              {selectMode && (
                <button
                  type="button"
                  onClick={() => toggleSelect(expense.id)}
                  className="flex-shrink-0 self-center w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isSelected ? '#0D9488' : 'white',
                    borderColor: isSelected ? '#0D9488' : '#D1D5DB',
                  }}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}

              {/* Expense row */}
              <div className="flex-1 min-w-0">
                <ExpenseSummaryCard
                  expense={expense}
                  linkedPlaceName={expense.place_id ? placeNameById[expense.place_id] ?? null : null}
                  href={selectMode ? undefined : `/trips/${tripId}/expenses/${expense.id}`}
                  onClick={selectMode ? () => toggleSelect(expense.id) : undefined}
                  compact
                  selected={isSelected}
                  disabled={isDeleting}
                  className={cn(isDeleting && 'pointer-events-none')}
                />
              </div>

              {/* Quick delete — visible on hover, hidden in select mode */}
              {canEdit && !selectMode && (
                <button
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  disabled={isDeleting}
                  className="flex-shrink-0 self-stretch flex items-center justify-center w-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  aria-label="Delete expense"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
