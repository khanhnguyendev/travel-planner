'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateMemberBalances } from '@/features/expenses/debt';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
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

  const memberMap = new Map(members.map((m) => [m.user_id, m]));

  // Sort: current user first, then by net desc
  const sorted = [...primaryBalances].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    return b.net - a.net;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold font-display uppercase tracking-widest text-muted-foreground ml-1">
        Balances ({primaryCurrency})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((b) => {
          const isYou = b.userId === currentUserId;
          const isOwed = b.net > 0.005;
          const isOwing = b.net < -0.005;
          const member = memberMap.get(b.userId);
          const name = member?.profile.display_name ?? 'Member';

          return (
            <div
              key={b.userId + b.currency}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all hover:shadow-soft",
                isYou 
                  ? "bg-primary/5 border-primary/20" 
                  : "bg-white border-slate-100"
              )}
            >
              <Avatar 
                user={{ 
                  display_name: name, 
                  avatar_url: member?.profile.avatar_url ?? null 
                }} 
                size="sm" 
                className="ring-2 ring-white" 
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[11px] font-bold truncate",
                  isYou ? "text-primary" : "text-foreground"
                )}>
                  {name}{isYou ? ' (you)' : ''}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isOwed ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : isOwing ? (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  ) : (
                    <Minus className="w-3 h-3 text-muted-foreground/40" />
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isOwed ? "text-emerald-600" : isOwing ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {isOwed ? 'Owed' : isOwing ? 'Owes' : 'Settled'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-display font-bold text-sm",
                  isOwed ? "text-emerald-600" : isOwing ? "text-red-500" : "text-muted-foreground"
                )}>
                  {isOwed ? '+' : ''}{formatCurrency(b.net, b.currency)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 text-center">
        Positive = owed back · Negative = owes others
      </p>
    </div>
  );
}
