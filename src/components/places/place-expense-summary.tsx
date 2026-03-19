import { Receipt } from 'lucide-react';
import type { PlaceExpenseHistoryEntry } from '@/lib/types';
import { formatCurrency, formatDateAndTime, formatDateTime } from '@/lib/format';

function getSummaryValue(expenses: PlaceExpenseHistoryEntry[]) {
  const currencies = Array.from(new Set(expenses.map((expense) => expense.currency)));
  if (currencies.length !== 1) {
    return `${expenses.length} entries`;
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return formatCurrency(total, currencies[0]);
}

export function PlaceExpenseSummary({
  expenses,
  label = 'Linked spending',
  className = '',
}: {
  expenses: PlaceExpenseHistoryEntry[];
  label?: string;
  className?: string;
}) {
  if (expenses.length === 0) {
    return null;
  }

  const latestExpense = expenses[0];
  const latestDate = latestExpense.expense_date
    ? formatDateAndTime(latestExpense.expense_date, latestExpense.created_at)
    : formatDateTime(latestExpense.created_at);

  return (
    <div className={`rounded-[1rem] border border-stone-200/80 bg-stone-50/85 px-3 py-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700">
          <Receipt className="h-3.5 w-3.5 text-teal-600" />
          {label}
        </span>
        <span className="text-xs font-semibold text-teal-700">
          {getSummaryValue(expenses)}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        {expenses.length === 1 ? latestExpense.title : `${expenses.length} expenses`} · Latest {latestDate}
      </p>
    </div>
  );
}
