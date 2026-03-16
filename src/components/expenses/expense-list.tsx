'use client';

import Link from 'next/link';
import { Receipt, User } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ExpenseListProps {
  expenses: Expense[];
  projectId: string;
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

export function ExpenseList({ expenses, projectId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <Receipt className="w-7 h-7" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--color-text)' }}>
          No expenses yet
        </h3>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
          Add your first expense to start tracking shared costs for this trip.
        </p>
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
            'card card-hover flex items-center gap-4 p-4 group transition-all'
          )}
        >
          {/* Receipt thumbnail or icon */}
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
                className="font-semibold text-sm truncate"
                style={{ color: 'var(--color-text)' }}
              >
                {expense.title}
              </span>
              <CurrencyPill currency={expense.currency} />
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {expense.expense_date
                  ? formatDate(expense.expense_date)
                  : formatDate(expense.created_at)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <span
              className="font-bold text-base"
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
