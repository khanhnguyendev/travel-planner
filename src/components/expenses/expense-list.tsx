'use client';

import Link from 'next/link';
import { Receipt, User, Plus } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ExpenseListProps {
  expenses: Expense[];
  projectId: string;
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

export function ExpenseList({ expenses, projectId, canEdit }: ExpenseListProps) {
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
            href={`/projects/${projectId}/expenses/new`}
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
    <div className="space-y-2">
      {expenses.map((expense) => (
        <Link
          key={expense.id}
          href={`/projects/${projectId}/expenses/${expense.id}`}
          className={cn(
            'card card-hover flex items-center gap-4 p-4 group transition-all',
            'hover:scale-[1.01] hover:shadow-md',
            // Mobile: stack on small screens, row on sm+
            'flex-col sm:flex-row min-h-[72px]'
          )}
        >
          {/* Receipt thumbnail or icon */}
          <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-1 min-w-0">
            {expense.receipt_path ? (
              <ReceiptThumbnail receiptPath={expense.receipt_path} />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <Receipt className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
            )}

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="font-semibold text-sm truncate text-stone-800"
                >
                  {expense.title}
                </span>
                <CurrencyPill currency={expense.currency} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {expense.expense_date
                    ? formatDate(expense.expense_date)
                    : formatDate(expense.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount — prominent on mobile */}
          <div className="w-full sm:w-auto text-left sm:text-right flex-shrink-0">
            <span
              className="font-bold text-lg sm:text-base"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
