'use client';

import { useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { updateTripBudget } from '@/features/trips/actions';
import { formatCurrency } from '@/lib/format';
import type { MemberWithProfile } from '@/features/members/queries';
import type { BudgetContribution } from '@/lib/types';
import { RefreshOverlay } from '@/components/ui/refresh-overlay';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', VND: '₫', GBP: '£', JPY: '¥', THB: '฿',
};
const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

interface BudgetEditorProps {
  tripId: string;
  budget: number | null;
  budgetCurrency: string;
  canManage: boolean;
  totalSpent: number;
  poolSpent: number;
  members: MemberWithProfile[];
  contributions: BudgetContribution[];
  actionSlot?: ReactNode;
}

export function BudgetEditor({
  tripId,
  budget,
  budgetCurrency,
  canManage,
  totalSpent,
  poolSpent,
  members,
  contributions,
  actionSlot,
}: BudgetEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget != null ? String(budget) : '');
  const [currency, setCurrency] = useState(budgetCurrency || 'VND');
  const [pending, setPending] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasBudget = budget != null;
  const activeCurrency = budgetCurrency || 'VND';

  const nameMap = new Map(members.map((m) => [m.user_id, m.profile.display_name ?? 'Member']));

  // Income = sum of all contributions in the trip currency
  const incomeByCurrency = contributions.filter((c) => c.currency === activeCurrency);
  const totalIncome = incomeByCurrency.reduce((sum, c) => sum + c.amount, 0);
  const hasIncome = totalIncome > 0;
  const poolBalance = totalIncome - poolSpent;

  // Contributors for display — group by user and sum amounts in the trip currency
  const contributorTotals = incomeByCurrency.reduce<Map<string, number>>((acc, c) => {
    acc.set(c.user_id, (acc.get(c.user_id) ?? 0) + c.amount);
    return acc;
  }, new Map());

  async function handleSave() {
    const parsed = value ? parseFloat(value) : null;
    if (value && (isNaN(parsed!) || parsed! <= 0)) {
      setError('Please enter a valid positive number');
      return;
    }

    setPending(true);
    setError(null);
    const result = await updateTripBudget(tripId, parsed ?? null, currency, null);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  function handleCancel() {
    setValue(budget != null ? String(budget) : '');
    setCurrency(activeCurrency);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        className="mt-4 rounded-xl px-4 py-3"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <p className="mb-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {hasBudget ? 'Edit budget cap' : 'Set budget cap'}
        </p>

        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              {CURRENCY_SYMBOLS[currency] ?? currency}
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border py-2 pl-8 pr-3 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'white',
                color: 'var(--color-text)',
              }}
              placeholder="0"
              autoFocus
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="cursor-pointer rounded-lg border px-2.5 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="btn-primary cursor-pointer px-3 py-2 text-xs disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="btn-secondary cursor-pointer px-3 py-2 text-xs"
          >
            Cancel
          </button>
        </div>

        {error && (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-error)' }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  const budgetAmount = budget ?? 0;
  const pct = hasBudget ? Math.min((totalSpent / budgetAmount) * 100, 100) : 0;
  const capRemaining = budgetAmount - totalSpent;
  const overBudget = hasBudget && totalSpent > budgetAmount;
  const barColor = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#14B8A6';

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
      <div className="px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {/* Budget cap row */}
          <div className="flex items-center gap-2">
            <span className="break-words text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {hasBudget ? `Budget cap: ${formatCurrency(budgetAmount, budgetCurrency)}` : 'No budget cap set'}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={isRefreshing}
                className="rounded p-1 transition-colors hover:bg-black/5 cursor-pointer"
                title="Edit budget cap"
              >
                <Pencil className="h-3 w-3" style={{ color: 'var(--color-text-subtle)' }} />
              </button>
            )}
          </div>

          {/* Income section */}
          {hasIncome ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  Income: <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(totalIncome, activeCurrency)}</span>
                </span>
                <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  Pool used: <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(poolSpent, activeCurrency)}</span>
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: poolBalance >= 0 ? '#0F766E' : '#EF4444' }}
                >
                  Pool balance: {formatCurrency(poolBalance, activeCurrency)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(contributorTotals.entries()).map(([uid, total]) => (
                  <span
                    key={uid}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-bg-muted)', color: 'var(--color-text-muted)' }}
                  >
                    {nameMap.get(uid) ?? 'Member'} +{formatCurrency(total, activeCurrency)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-subtle)' }}>
              No income recorded yet. Use Add money to track who funded the trip.
            </p>
          )}
        </div>

        {(canManage || actionSlot) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            {actionSlot}
          </div>
        )}
        </div>

        {/* Progress bar — only when budget cap is set */}
        {hasBudget && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1 sm:flex sm:items-center sm:justify-between sm:gap-3">
              <span className="break-words text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                {Math.round(pct)}% of cap used
              </span>
              <span className="break-words text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {formatCurrency(totalSpent, budgetCurrency)} spent
              </span>
              <span
                className="break-words text-xs font-medium"
                style={{ color: overBudget ? '#EF4444' : 'var(--color-text-subtle)' }}
              >
                {overBudget
                  ? `${formatCurrency(Math.abs(capRemaining), budgetCurrency)} over cap`
                  : `${formatCurrency(capRemaining, budgetCurrency)} remaining`}
              </span>
            </div>
          </>
        )}
      </div>

      {isRefreshing && <RefreshOverlay label="Updating budget" />}
    </div>
  );
}
