'use client';

import { useState } from 'react';
import { Coins, Plus, Receipt } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { BudgetIncomeForm } from '@/components/trips/budget-income-form';
import type { MemberWithProfile } from '@/features/members/queries';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';

type MoneyTab = 'income' | 'expense';

interface AddMoneyDialogProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  places?: Place[];
  budget: number | null;
  budgetCurrency: string;
  budgetPayerUserId: string | null;
  canManageBudget: boolean;
  initialTab?: MoneyTab;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function AddMoneyDialog({
  tripId,
  members,
  currentUserId,
  places,
  budget,
  budgetCurrency,
  budgetPayerUserId,
  canManageBudget,
  initialTab,
  triggerLabel = 'Add money',
  triggerClassName,
}: AddMoneyDialogProps) {
  const [open, setOpen] = useState(false);
  const defaultTab = initialTab ?? (canManageBudget && budget == null ? 'income' : 'expense');
  const [activeTab, setActiveTab] = useState<MoneyTab>(defaultTab);

  function handleOpen() {
    setActiveTab(defaultTab);
    setOpen(true);
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
        <Plus className="w-4 h-4" />
        {triggerLabel}
      </button>

      {open && (
        <Dialog
          title={activeTab === 'income' ? (budget != null ? 'Add income' : 'Set budget') : 'Add expense'}
          onClose={() => setOpen(false)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            {canManageBudget && (
              <div
                className="inline-flex rounded-[1rem] p-1"
                style={{ backgroundColor: 'var(--color-bg-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('income')}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[0.85rem] px-3.5 py-2 text-sm font-semibold transition-colors"
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
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[0.85rem] px-3.5 py-2 text-sm font-semibold transition-colors"
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
                budget={budget}
                budgetCurrency={budgetCurrency}
                budgetPayerUserId={budgetPayerUserId}
                members={members}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            ) : (
              <ExpenseForm
                tripId={tripId}
                members={members}
                currentUserId={currentUserId}
                places={places}
                onSuccess={() => setOpen(false)}
                onCancel={() => setOpen(false)}
              />
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
