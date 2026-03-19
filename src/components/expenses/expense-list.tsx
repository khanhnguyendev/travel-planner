'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  Receipt, 
  Wallet, 
  MapPin, 
  FileText, 
  ExternalLink, 
  Pencil, 
  Trash2,
  CheckSquare
} from 'lucide-react';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import { deleteExpense } from '@/features/expenses/actions';
import { useLoadingToast } from '@/components/ui/toast';
import type { TripRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { ExpenseSummaryCard } from './expense-summary-card';

interface ExpenseListProps {
  expenses: ExpenseWithSplits[];
  tripId: string;
  placeNameById?: Record<string, string>;
  role: TripRole;
}

export function ExpenseList({ expenses: initialExpenses, tripId, placeNameById = {}, role }: ExpenseListProps) {
  // Simple check as requested: owner or admin can edit/delete
  const canModify = role === 'owner' || role === 'admin';
  const canCreate = ['owner', 'admin', 'editor'].includes(role);
  
  const [expenses, setExpenses] = useState(initialExpenses);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const loadingToast = useLoadingToast();

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    setDeleting((prev) => new Set(prev).add(id));
    const resolve = loadingToast('Deleting expense...');
    
    const result = await deleteExpense(id);
    if (result.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      resolve('Expense deleted', 'success');
      emitTripSectionRefresh(tripId, [TRIP_REFRESH_SECTIONS.expenses]);
    } else {
      resolve(result.error ?? 'Failed to delete', 'error');
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-50">
          <Receipt className="h-8 w-8 text-stone-300" />
        </div>
        <h3 className="text-sm font-semibold text-stone-900">No expenses yet</h3>
        <p className="mt-1 text-xs text-stone-500 max-w-[200px]">
          Start tracking your trip spending here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions if owner/admin */}
      {canModify && (
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <button
              onClick={() => { setSelectMode(true); setSelectedIds(new Set()); }}
              className="inline-flex items-center gap-1.5 rounded-[1rem] border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[0.03]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </button>
          ) : (
            <>
              <button
                onClick={() => setSelectMode(false)}
                className="text-xs font-medium text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
              <span className="text-xs text-stone-400">{selectedIds.size} selected</span>
            </>
          )}
        </div>
      )}

      {expenses.map((expense) => {
        const isSelected = selectedIds.has(expense.id);
        const isDeleting = deleting.has(expense.id);

        return (
          <div key={expense.id} className="relative group">
            {selectMode && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(expense.id)}
                  className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                />
              </div>
            )}
            
            <div className={cn(
              'transition-all duration-200',
              selectMode && 'pl-10'
            )}>
              <ExpenseSummaryCard
                expense={expense}
                linkedPlaceName={expense.place_id ? placeNameById[expense.place_id] : null}
                href={`/trips/${tripId}/expenses/${expense.id}`}
                onClick={selectMode ? () => toggleSelect(expense.id) : undefined}
                compact={true}
                selected={isSelected}
                disabled={isDeleting}
                className={cn(isDeleting && 'pointer-events-none')}
                tripId={tripId}
                canModify={canModify}
                onDelete={handleDelete}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
