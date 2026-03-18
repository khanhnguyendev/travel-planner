'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Receipt, User, Plus, Trash2, CheckSquare, X, MapPin } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { deleteExpense } from '@/features/expenses/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORY_EMOJIS: Record<string, string> = {
  'Accommodation': '🛏️',
  'Entertainment': '🎤',
  'Groceries': '🛒',
  'Healthcare': '🦷',
  'Insurance': '🧯',
  'Rent & Charges': '🏠',
  'Restaurants & Bars': '🍔',
  'Shopping': '🛍️',
  'Transport': '🚕',
  'Other': '🤚',
};

interface ExpenseListProps {
  expenses: Expense[];
  tripId: string;
  placeNameById?: Record<string, string>;
  canEdit?: boolean;
}

function ReceiptThumbnail({ receiptPath }: { receiptPath: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/receipts/${receiptPath}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={publicUrl}
      alt="Receipt"
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

function CurrencyPill({ currency }: { currency: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        color: 'var(--color-text-muted)',
      }}
    >
      {currency}
    </span>
  );
}

export function ExpenseList({ expenses: initialExpenses, tripId, placeNameById = {}, canEdit }: ExpenseListProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const loadingToast = useLoadingToast();

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
    } else {
      resolve(`${failed} failed to delete`, 'error');
      const succeeded = ids.filter((_, i) => results[i].ok);
      setExpenses((prev) => prev.filter((e) => !succeeded.includes(e.id)));
      setSelectedIds((prev) => { const next = new Set(prev); succeeded.forEach((id) => next.delete(id)); return next; });
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
            <div key={expense.id} className="relative flex items-stretch gap-2">
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
              <Link
                href={selectMode ? '#' : `/trips/${tripId}/expenses/${expense.id}`}
                onClick={selectMode ? (e) => { e.preventDefault(); toggleSelect(expense.id); } : undefined}
                className={cn(
                  'card card-hover flex flex-1 items-center gap-4 p-4 group transition-all',
                  'hover:scale-[1.01] hover:shadow-md',
                  'flex-col sm:flex-row min-h-[72px]',
                  isSelected && 'ring-2 ring-teal-500',
                  isDeleting && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
                  {expense.receipt_path ? (
                    <ReceiptThumbnail receiptPath={expense.receipt_path} />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-primary-light)' }}
                    >
                      {expense.category && EXPENSE_CATEGORY_EMOJIS[expense.category]
                        ? <span className="text-xl leading-none">{EXPENSE_CATEGORY_EMOJIS[expense.category]}</span>
                        : <Receipt className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate text-stone-800">{expense.title}</span>
                      <CurrencyPill currency={expense.currency} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {expense.expense_date ? formatDate(expense.expense_date) : formatDate(expense.created_at)}
                      </span>
                      {expense.category && <span className="truncate text-stone-500">{expense.category}</span>}
                    </div>
                    {expense.place_id && placeNameById[expense.place_id] && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{placeNameById[expense.place_id]}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-auto text-left sm:text-right flex-shrink-0">
                  <span className="font-bold text-lg sm:text-base" style={{ color: 'var(--color-primary)' }}>
                    {formatCurrency(expense.amount, expense.currency)}
                  </span>
                </div>
              </Link>

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
