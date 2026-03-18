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

import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function DebtSummary({ expenses, members, currentUserId }: DebtSummaryProps) {
  const debts = calculateDebts(expenses);

  // Build a userId → display_name lookup from members
  const nameMap = new Map<string, string>();
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
    <div className="card-premium p-8 mb-8 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
      
      {/* Card header */}
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shadow-soft">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Settlement Summary</h2>
          <p className="text-xs text-muted-foreground">Automatic calculations of who owes what.</p>
        </div>
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
              const fromMember = members.find(m => m.user_id === debt.from);
              const toMember = members.find(m => m.user_id === debt.to);
              const fromName = fromMember?.display_name ?? 'Unknown';
              const toName = toMember?.display_name ?? 'Unknown';
              const isInvolved = debt.from === currentUserId || debt.to === currentUserId;

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-soft relative z-10",
                    isInvolved 
                      ? "bg-primary/5 border-primary/20 shadow-soft" 
                      : "bg-white border-slate-100"
                  )}
                >
                  <Avatar user={{ display_name: fromName, avatar_url: fromMember?.avatar_url ?? null }} size="sm" className="ring-2 ring-white" />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[11px] font-bold uppercase tracking-wider",
                      isInvolved ? "text-primary" : "text-slate-600"
                    )}>
                      {fromName} <span className="text-slate-400 font-medium">owes</span> {toName}
                    </p>
                  </div>
                  <Avatar user={{ display_name: toName, avatar_url: toMember?.avatar_url ?? null }} size="sm" className="ring-2 ring-white" />
                  <div className="text-right ml-2">
                    <p className={cn(
                      "font-display font-bold text-base",
                      isInvolved ? "text-primary" : "text-slate-900"
                    )}>
                      {formatCurrency(debt.amount, debt.currency)}
                    </p>
                  </div>
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
