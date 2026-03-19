'use client';

import { useState, useTransition } from 'react';
import { Coins, Plus, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { BudgetIncomeForm } from '@/components/trips/budget-income-form';
import type { MemberWithProfile } from '@/features/members/queries';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TRIP_BUDGET_REFRESH_EVENT } from '@/components/trips/budget-refresh';

type MoneyTab = 'income' | 'expense';

interface AddMoneyDialogProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  places?: Place[];
  budgetCurrency: string;
  canManageBudget: boolean;
  poolBalance?: number;
  initialTab?: MoneyTab;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerIcon?: React.ReactNode;
  onTriggerClick?: () => void;
  // kept for dialog title logic
  budget?: number | null;
}

export function AddMoneyDialog({
  tripId,
  members,
  currentUserId,
  places,
  budget,
  budgetCurrency,
  canManageBudget,
  poolBalance,
  initialTab,
  triggerLabel = 'Add money',
  triggerClassName,
  triggerIcon,
  onTriggerClick,
}: AddMoneyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const defaultTab = initialTab ?? (canManageBudget ? 'income' : 'expense');
  const [activeTab, setActiveTab] = useState<MoneyTab>(defaultTab);

  function handleOpen() {
    onTriggerClick?.();
    setActiveTab(defaultTab);
    setOpen(true);
  }

  function handleSuccess() {
    window.dispatchEvent(new Event(TRIP_BUDGET_REFRESH_EVENT));
    setOpen(false);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'btn-primary inline-flex min-h-[44px] items-center gap-1.5 text-sm',
          triggerClassName
        )}
      >
        {triggerIcon ?? <Plus className="w-4 h-4" />}
        {triggerLabel}
      </button>

      {open && (
        <Dialog
          title={activeTab === 'income' ? (budget != null ? 'Add income' : 'Set budget') : 'Add expense'}
          onClose={() => setOpen(false)}
          maxWidth="sm:max-w-xl"
        >
          <div className="min-w-0 space-y-3 overflow-x-hidden sm:space-y-5">
            {canManageBudget && (
              <div
                className="grid w-full min-w-0 grid-cols-2 rounded-[1rem] p-1"
                style={{ backgroundColor: 'var(--color-bg-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('income')}
                  className="inline-flex min-h-[42px] min-w-0 items-center justify-center gap-1 rounded-[0.85rem] px-2.5 py-2 text-xs font-semibold transition-colors sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:text-sm"
                  style={{
                    backgroundColor: activeTab === 'income' ? 'white' : 'transparent',
                    color: activeTab === 'income' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    boxShadow: activeTab === 'income' ? '0 4px 16px rgba(15, 23, 42, 0.06)' : 'none',
                  }}
                >
                  <Coins className="h-4 w-4" />
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expense')}
                  className="inline-flex min-h-[42px] min-w-0 items-center justify-center gap-1 rounded-[0.85rem] px-2.5 py-2 text-xs font-semibold transition-colors sm:min-h-[44px] sm:gap-1.5 sm:px-3 sm:text-sm"
                  style={{
                    backgroundColor: activeTab === 'expense' ? 'white' : 'transparent',
                    color: activeTab === 'expense' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    boxShadow: activeTab === 'expense' ? '0 4px 16px rgba(15, 23, 42, 0.06)' : 'none',
                  }}
                >
                  <Receipt className="h-4 w-4" />
                  Expense
                </button>
              </div>
            )}

            {activeTab === 'income' && canManageBudget ? (
              <BudgetIncomeForm
                tripId={tripId}
                budgetCurrency={budgetCurrency}
                members={members}
                currentUserId={currentUserId}
                onSuccess={handleSuccess}
                onCancel={() => setOpen(false)}
              />
            ) : (
              <ExpenseForm
                tripId={tripId}
                members={members}
                currentUserId={currentUserId}
                places={places}
                poolBalance={poolBalance}
                poolCurrency={budgetCurrency}
                onSuccess={handleSuccess}
                onCancel={() => setOpen(false)}
              />
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
