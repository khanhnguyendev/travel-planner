'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { updateTripBudget } from '@/features/trips/actions';
import { formatCurrency } from '@/lib/format';
import type { MemberWithProfile } from '@/features/members/queries';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', VND: '₫', GBP: '£', JPY: '¥', THB: '฿',
};
const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

interface BudgetEditorProps {
  tripId: string;
  budget: number | null;
  budgetCurrency: string;
  budgetPayerUserId: string | null;
  canManage: boolean;
  totalSpent: number;
  members: MemberWithProfile[];
  actionSlot?: ReactNode;
}

export function BudgetEditor({
  tripId,
  budget,
  budgetCurrency,
  budgetPayerUserId,
  canManage,
  totalSpent,
  members,
  actionSlot,
}: BudgetEditorProps) {
  const [mode, setMode] = useState<'idle' | 'set' | 'edit' | 'income'>('idle');
  const [value, setValue] = useState(budget != null ? String(budget) : '');
  const [currency, setCurrency] = useState(budgetCurrency || 'VND');
  const [payerUserId, setPayerUserId] = useState<string>(budgetPayerUserId ?? members[0]?.user_id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasBudget = budget != null;
  const activeCurrency = budgetCurrency || 'VND';
  const resolvedPayerUserId = budgetPayerUserId ?? members[0]?.user_id ?? '';
  const payerName = members.find((m) => m.user_id === budgetPayerUserId)?.profile.display_name ?? 'Someone';

  function resetDraft(nextValue?: string) {
    setValue(nextValue ?? (budget != null ? String(budget) : ''));
    setCurrency(activeCurrency);
    setPayerUserId(resolvedPayerUserId);
    setError(null);
  }

  function openEditor(nextMode: 'set' | 'edit' | 'income') {
    resetDraft(nextMode === 'income' ? '' : undefined);
    setMode(nextMode);
  }

  async function handleSave() {
    const parsed = value ? parseFloat(value) : null;
    if ((mode === 'set' || mode === 'income') && (!value || isNaN(parsed!) || parsed! <= 0)) {
      setError('Please enter a valid positive number');
      return;
    }
    if (mode === 'edit' && value && (isNaN(parsed!) || parsed! <= 0)) {
      setError('Please enter a valid positive number');
      return;
    }
    const nextPayerUserId =
      mode === 'income' && hasBudget
        ? (budgetPayerUserId ?? payerUserId)
        : payerUserId;
    if ((parsed || mode === 'income') && !nextPayerUserId) {
      setError('Please select who funded the budget');
      return;
    }

    const nextBudget = mode === 'income'
      ? (budget ?? 0) + (parsed ?? 0)
      : (parsed ?? null);
    const nextCurrency = mode === 'income' && hasBudget ? activeCurrency : currency;

    setPending(true);
    setError(null);
    const result = await updateTripBudget(
      tripId,
      nextBudget,
      nextCurrency,
      nextBudget ? nextPayerUserId : null
    );
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    resetDraft();
    setMode('idle');
  }

  function handleCancel() {
    resetDraft();
    setMode('idle');
  }

  if (mode === 'idle') {
    const budgetAmount = budget ?? 0;
    const spent = totalSpent;
    const pct = hasBudget ? Math.min((spent / budgetAmount) * 100, 100) : 0;
    const remaining = hasBudget ? budgetAmount - spent : 0;
    const overBudget = hasBudget ? spent > budgetAmount : false;
    const barColor =
      pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#14B8A6';

    return (
      <div
        className="mt-4 overflow-hidden rounded-xl px-4 py-4"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="break-words text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {hasBudget ? `Budget: ${formatCurrency(budgetAmount, budgetCurrency)}` : 'No budget set yet'}
              </span>
              {canManage && hasBudget && (
                <button
                  type="button"
                  onClick={() => openEditor('edit')}
                  className="rounded p-1 transition-colors hover:bg-black/5 cursor-pointer"
                  title="Edit budget"
                >
                  <Pencil className="h-3 w-3" style={{ color: 'var(--color-text-subtle)' }} />
                </button>
              )}
            </div>
            {hasBudget ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                {budgetPayerUserId ? (
                  <>
                    Funded by <span className="font-medium">{payerName}</span>
                  </>
                ) : (
                  'Track incoming funds and outgoing shared costs here.'
                )}
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-subtle)' }}>
                Use Add money to create the trip budget, then switch to the expense tab for outgoing shared costs.
              </p>
            )}
          </div>

          {(canManage || actionSlot) && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              {canManage && !actionSlot && (
                <button
                  type="button"
                  onClick={() => openEditor(hasBudget ? 'income' : 'set')}
                  className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer sm:w-auto"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {hasBudget ? 'Add income' : 'Set budget'}
                </button>
              )}
              {actionSlot}
            </div>
          )}
        </div>

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
                {Math.round(pct)}% used
              </span>
              <span className="break-words text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {formatCurrency(spent, budgetCurrency)} spent
              </span>
              <span
                className="break-words text-xs font-medium"
                style={{ color: overBudget ? '#EF4444' : 'var(--color-text-subtle)' }}
              >
                {overBudget
                  ? `${formatCurrency(Math.abs(remaining), budgetCurrency)} over budget`
                  : `${formatCurrency(remaining, budgetCurrency)} remaining`}
              </span>
            </div>
          </>
        )}
      </div>
    );
  }

  const isIncomeMode = mode === 'income';
  const showPayerField = !isIncomeMode || !hasBudget || !budgetPayerUserId;
  const editorTitle =
    mode === 'income'
      ? (hasBudget ? 'Add income' : 'Set budget')
      : (hasBudget ? 'Edit budget' : 'Set budget');

  return (
    <div
      className="mt-4 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      <p className="mb-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
        {editorTitle}
      </p>

      {isIncomeMode && hasBudget && (
        <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-subtle)' }}>
          This adds directly to the shared budget total in {activeCurrency}. Existing expenses stay unchanged.
        </p>
      )}

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
        {isIncomeMode && hasBudget ? (
          <div
            className="inline-flex min-h-[40px] items-center rounded-lg border px-3 text-sm font-medium"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {activeCurrency}
          </div>
        ) : (
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
        )}
      </div>

      {showPayerField && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Funded by
          </label>
          <select
            value={payerUserId}
            onChange={(e) => setPayerUserId(e.target.value)}
            className="w-full cursor-pointer rounded-lg border px-2.5 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile.display_name ?? m.user_id}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            The person who put in the money for this trip.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="btn-primary cursor-pointer px-3 py-2 text-xs disabled:opacity-60"
        >
          {pending ? 'Saving…' : isIncomeMode ? 'Add income' : 'Save'}
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
