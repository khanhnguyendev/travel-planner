'use client';

import { useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { TripReport } from './trip-report';
import { UserTransactionReportDrawer } from './user-transaction-report';
import type { TripExpenseReport, UserTransactionReport } from '@/features/expenses/reports';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import type { BudgetContribution, Trip } from '@/lib/types';

interface ExpenseReportShellProps {
  tripReport: TripExpenseReport;
  userReports: UserTransactionReport[];
  expenses: ExpenseWithSplits[];
  contributions: BudgetContribution[];
  trip: Trip;
}

export function ExpenseReportShell({
  tripReport,
  userReports,
  expenses,
  contributions,
  trip,
}: ExpenseReportShellProps) {
  const [showTripReport, setShowTripReport] = useState(false);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  const openUserReport = userReports.find((r) => r.userId === openUserId) ?? null;

  if (tripReport.expenseCount === 0) return null;

  return (
    <>
      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <BarChart3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Reports
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowTripReport(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 min-h-[36px]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            View trip report
          </button>
        </div>

        {userReports.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                Members
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {userReports.map((r) => (
                <button
                  key={r.userId}
                  type="button"
                  onClick={() => setOpenUserId(r.userId)}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors hover:border-teal-200 hover:bg-teal-50 min-h-[44px]"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <Avatar
                    user={{ display_name: r.displayName, avatar_url: r.avatarUrl }}
                    size="sm"
                  />
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                    {r.displayName ?? 'Unknown'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showTripReport && (
        <TripReport
          report={tripReport}
          expenses={expenses}
          contributions={contributions}
          trip={trip}
          onClose={() => setShowTripReport(false)}
        />
      )}

      {openUserReport && (
        <UserTransactionReportDrawer
          report={openUserReport}
          onClose={() => setOpenUserId(null)}
        />
      )}
    </>
  );
}
