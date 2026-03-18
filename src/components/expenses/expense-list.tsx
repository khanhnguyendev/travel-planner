'use client';

import Link from 'next/link';
import { Receipt, User, Plus } from 'lucide-react';
import type { Expense } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
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
    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-muted-foreground border border-slate-200">
      {currency}
    </span>
  );
}

export function ExpenseList({ expenses, tripId, canEdit }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="card-premium flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-slate-50/50">
        <div className="w-16 h-16 rounded-[2rem] bg-amber-100 flex items-center justify-center mb-6 shadow-soft">
          <Receipt className="w-8 h-8 text-amber-600 shadow-premium" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-2">No Shared Expenses</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-8 leading-relaxed">
          Log your restaurants, transport, and more to keep everyone updated on the budget.
        </p>
        {canEdit && (
          <Link
            href={`/trips/${tripId}/expenses/new`}
            className="btn-premium flex items-center gap-2 h-[48px] px-8"
          >
            <Plus className="w-5 h-5" />
            Add First Expense
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {expenses.map((expense) => (
        <Link
          key={expense.id}
          href={`/trips/${tripId}/expenses/${expense.id}`}
          className={cn(
            'card-premium group flex items-center gap-5 p-5 transition-all duration-300',
            'flex-row min-h-[80px]'
          )}
        >
          {/* Receipt thumbnail or icon */}
          <div className="flex-shrink-0 relative">
            {expense.receipt_path ? (
              <ReceiptThumbnail receiptPath={expense.receipt_path} />
            ) : (
              <div className="w-12 h-12 rounded-[1.25rem] bg-primary/5 border border-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 shadow-soft">
                {expense.category && EXPENSE_CATEGORY_EMOJIS[expense.category]
                  ? <span className="text-2xl leading-none">{EXPENSE_CATEGORY_EMOJIS[expense.category]}</span>
                  : <Receipt className="w-6 h-6 text-primary" />}
              </div>
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h4 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                {expense.title}
              </h4>
              <CurrencyPill currency={expense.currency} />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span className="truncate">
                  {expense.expense_date
                    ? formatDate(expense.expense_date)
                    : formatDate(expense.created_at)}
                </span>
              </div>
              {expense.category && (
                <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-slate-50 border border-slate-100 italic lowercase tracking-normal">
                  {expense.category}
                </div>
              )}
            </div>
          </div>

          {/* Amount — prominent */}
          <div className="text-right flex-shrink-0 ml-2">
            <p className="font-display font-bold text-lg text-primary">
              {formatCurrency(expense.amount, expense.currency)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
