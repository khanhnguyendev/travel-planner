'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateMemberBalances } from '@/features/expenses/debt';
import { formatCurrency } from '@/lib/format';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import type { MemberWithProfile } from '@/features/members/queries';

interface MemberBalancesProps {
  expenses: ExpenseWithSplits[];
  members: MemberWithProfile[];
  currentUserId: string;
  budgetAmount: number | null;
  budgetCurrency: string;
  budgetPayerUserId: string | null;
}

export function MemberBalances({
  expenses,
  members,
  currentUserId,
  budgetAmount,
  budgetCurrency,
  budgetPayerUserId,
}: MemberBalancesProps) {
  if (expenses.length === 0 && !budgetAmount) return null;

  const memberUserIds = members.map((m) => m.user_id);
  const balances = calculateMemberBalances(expenses, {
    budgetAmount,
    budgetCurrency,
    budgetPayerUserId,
    memberUserIds,
  });

  // Group by currency, pick the primary currency
  const primaryCurrency = budgetCurrency || expenses[0]?.currency || 'VND';
  const primaryBalances = balances.filter((b) => b.currency === primaryCurrency);

  if (primaryBalances.length === 0) return null;

  const nameMap = new Map(members.map((m) => [m.user_id, m.profile.display_name ?? 'Member']));

  // Sort: current user first, then by net desc
  const sorted = [...primaryBalances].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return b.net - a.net;
  });

  return (
    <div>
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Balances ({primaryCurrency})
      </p>
      <div className="space-y-1.5">
        {sorted.map((b) => {
          const isYou = b.userId === currentUserId;
          const isOwed = b.net > 0.005;
          const isOwing = b.net < -0.005;
          const name = nameMap.get(b.userId) ?? 'Unknown';

          return (
            <div
              key={b.userId + b.currency}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                backgroundColor: isYou ? 'var(--color-primary-light)' : 'var(--color-bg-subtle)',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: isYou ? 'var(--color-primary)' : '#94A3B8' }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <span
                className="flex-1 text-xs font-medium truncate"
                style={{ color: 'var(--color-text)' }}
              >
                {name}{isYou ? ' (you)' : ''}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isOwed ? (
                  <TrendingUp className="w-3 h-3 text-teal-600" />
                ) : isOwing ? (
                  <TrendingDown className="w-3 h-3 text-red-500" />
                ) : (
                  <Minus className="w-3 h-3 text-stone-400" />
                )}
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: isOwed ? '#0F766E' : isOwing ? '#EF4444' : 'var(--color-text-muted)',
                  }}
                >
                  {isOwed ? '+' : ''}{formatCurrency(b.net, b.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
        Positive = owed back · Negative = owes others
      </p>
    </div>
  );
}
