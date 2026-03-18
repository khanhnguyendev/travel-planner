import Link from 'next/link';
import { FileText, Receipt } from 'lucide-react';
import type { PlaceExpenseHistoryEntry } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';

export function PlaceExpenseHistory({
  tripId,
  expenses,
  emptyLabel = 'No expenses linked to this place yet.',
}: {
  tripId: string;
  expenses: PlaceExpenseHistoryEntry[];
  emptyLabel?: string;
}) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-[1.1rem] border border-dashed border-stone-200 bg-stone-50/70 px-4 py-4 text-sm text-stone-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {expenses.map((expense) => (
        <Link
          key={expense.id}
          href={`/trips/${tripId}/expenses/${expense.id}`}
          className="block rounded-[1.15rem] border border-stone-200/80 bg-stone-50/80 px-4 py-3 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-stone-800">
                  {expense.title}
                </p>
                {expense.receipt_path && (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm">
                    <Receipt className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {expense.paid_by_name ?? 'Member'}
                {expense.category ? ` · ${expense.category}` : ''}
                {' · '}
                {formatDate(expense.expense_date ?? expense.created_at)}
              </p>
              {expense.note && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">
                  {expense.note}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-teal-700">
                {formatCurrency(expense.amount, expense.currency)}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone-400">
                {expense.splits_count} split{expense.splits_count === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">
            <FileText className="h-3.5 w-3.5" />
            Open expense detail
          </div>
        </Link>
      ))}
    </div>
  );
}
