'use client';

import { CheckCircle2 } from 'lucide-react';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import type { Profile } from '@/lib/types';
import { calculateDebts } from '@/features/expenses/debt';
import { formatCurrency } from '@/lib/format';

export type DebtSummaryMember = Pick<Profile, 'id' | 'display_name' | 'avatar_url'> & {
  user_id: string;
};

interface DebtSummaryProps {
  expenses: ExpenseWithSplits[];
  members: DebtSummaryMember[];
  currentUserId: string;
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function DebtSummary({ expenses, members, currentUserId }: DebtSummaryProps) {
  const debts = calculateDebts(expenses);

  // Build a userId → display_name lookup from members
  const nameMap = new Map<string, string>();
  nameMap.set('pool', 'Pool');
  for (const m of members) {
    nameMap.set(m.user_id, m.display_name ?? 'Unknown');
  }

  // Collect unique currencies that appear in the debts
  const currencies = Array.from(new Set(debts.map((d) => d.currency)));
  const hasMultipleCurrencies = currencies.length > 1;

  // Per-currency totals for the current user (what they owe total, what they're owed total)
  const currencyTotals: Record<string, { owe: number; owed: number }> = {};
  if (hasMultipleCurrencies) {
    for (const debt of debts) {
      if (!currencyTotals[debt.currency]) {
        currencyTotals[debt.currency] = { owe: 0, owed: 0 };
      }
      if (debt.from === currentUserId) {
        currencyTotals[debt.currency].owe += debt.amount;
      }
      if (debt.to === currentUserId) {
        currencyTotals[debt.currency].owed += debt.amount;
      }
    }
  }

  return (
    <div className="card mb-5 overflow-hidden p-4 sm:p-6">
      {/* Card header */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--color-primary-light)' }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 className="font-semibold text-base text-stone-800">Settlement summary</h2>
      </div>

      {debts.length === 0 ? (
        <div className="flex items-center gap-2 py-3 text-sm text-stone-500">
          <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <span>All settled up!</span>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {debts.map((debt, idx) => {
              const fromName = nameMap.get(debt.from) ?? 'Unknown';
              const toName = nameMap.get(debt.to) ?? 'Unknown';
              const isInvolved =
                debt.from === currentUserId || debt.to === currentUserId;

              return (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-3"
                  style={{
                    backgroundColor: isInvolved
                      ? 'var(--color-primary-light)'
                      : 'var(--color-bg-subtle)',
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:flex-1">
                    <Avatar name={fromName} />
                    <span
                      className="min-w-0 flex-1 text-sm leading-snug"
                      style={{
                        color: isInvolved
                          ? 'var(--color-primary)'
                          : 'var(--color-text)',
                      }}
                    >
                      <strong>{fromName}</strong>
                      <span className="sm:hidden">{' -> '}</span>
                      <span className="hidden sm:inline"> owes </span>
                      <strong>{toName}</strong>
                    </span>
                    <Avatar name={toName} />
                  </div>
                  <span
                    className="self-end text-sm font-semibold sm:ml-2 sm:self-auto"
                    style={{
                      color: isInvolved
                        ? 'var(--color-primary)'
                        : 'var(--color-text)',
                    }}
                  >
                    {formatCurrency(debt.amount, debt.currency)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Per-currency totals when multiple currencies exist */}
          {hasMultipleCurrencies && (
            <div className="mt-4 pt-4 border-t space-y-1" style={{ borderColor: 'var(--color-border-muted)' }}>
              <p className="text-xs font-semibold text-stone-500 mb-2">Totals by currency</p>
              {currencies.map((cur) => {
                const totals: Record<string, number> = {};
                for (const d of debts.filter((d) => d.currency === cur)) {
                  totals[d.currency] = (totals[d.currency] ?? 0) + d.amount;
                }
                const total = debts
                  .filter((d) => d.currency === cur)
                  .reduce((sum, d) => sum + d.amount, 0);
                return (
                  <div key={cur} className="flex items-center justify-between text-xs text-stone-500">
                    <span>{cur}</span>
                    <span className="font-medium">{formatCurrency(total, cur)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
