'use client';

import { useState } from 'react';
import { ChevronDown, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { ExpenseSummaryCard } from './expense-summary-card';

interface RecentTransactionsListProps {
  expenses: ExpenseWithSplits[];
  placeNameById: Record<string, string>;
  transportNameById: Record<string, string>;
  transportTypeById: Record<string, 'rent' | 'bus' | 'plane'>;
  tripId: string;
}

export function RecentTransactionsList({
  expenses,
  placeNameById,
  transportNameById,
  transportTypeById,
  tripId,
}: RecentTransactionsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (expenses.length === 0) {
    return (
      <div className="rounded-[1.25rem] bg-white/70 px-4 py-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        No transactions yet. Add income or log the first shared expense to start the trip ledger.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center justify-between rounded-xl bg-white/50 px-4 py-3 transition-all hover:bg-white/80 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors group-hover:bg-stone-200">
            <ReceiptText className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-stone-700">
            {isExpanded ? 'Hide transactions' : `Show ${Math.min(expenses.length, 5)} recent transactions`}
          </p>
        </div>
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-stone-400 transition-transform duration-300",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      {isExpanded && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {expenses.map((expense, index) => (
            <ExpenseSummaryCard
              key={expense.id}
              expense={expense}
              linkedPlaceName={expense.place_id ? placeNameById[expense.place_id] ?? null : null}
              linkedTransportName={expense.transport_booking_id ? transportNameById[expense.transport_booking_id] ?? null : null}
              linkedTransportType={expense.transport_booking_id ? transportTypeById[expense.transport_booking_id] ?? null : null}
              href={`/trips/${tripId}/expenses/${expense.id}`}
              compact
              className={index >= 3 ? 'hidden lg:block' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
