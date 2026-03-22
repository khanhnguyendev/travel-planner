'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { TripReport } from './trip-report';
import type { TripExpenseReport } from '@/features/expenses/reports';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import type { BudgetContribution, Trip } from '@/lib/types';

interface TripReportButtonProps {
  tripReport: TripExpenseReport;
  expenses: ExpenseWithSplits[];
  contributions: BudgetContribution[];
  trip: Trip;
}

export function TripReportButton({ tripReport, expenses, contributions, trip }: TripReportButtonProps) {
  const [open, setOpen] = useState(false);

  if (tripReport.expenseCount === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 min-h-[36px]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        View report
      </button>

      {open && (
        <TripReport
          report={tripReport}
          expenses={expenses}
          contributions={contributions}
          trip={trip}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
