'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { updateTripBudget } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';
import type { MemberWithProfile } from '@/features/members/queries';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: 'EUR', VND: '₫', GBP: '£', JPY: '¥', THB: '฿',
};

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

interface BudgetIncomeFormProps {
  tripId: string;
  budget: number | null;
  budgetCurrency: string;
  budgetPayerUserId: string | null;
  members: MemberWithProfile[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BudgetIncomeForm({
  tripId,
  budget,
  budgetCurrency,
  budgetPayerUserId,
  members,
  onSuccess,
  onCancel,
}: BudgetIncomeFormProps) {
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState(budgetCurrency || 'VND');
  const [payerUserId, setPayerUserId] = useState(budgetPayerUserId ?? members[0]?.user_id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  const hasBudget = budget != null;
  const activeCurrency = budgetCurrency || 'VND';
  const showPayerField = !hasBudget || !budgetPayerUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = value ? parseFloat(value) : NaN;
    if (!value || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    const nextPayerUserId = hasBudget
      ? (budgetPayerUserId ?? payerUserId)
      : payerUserId;

    if (!nextPayerUserId) {
      setError('Please select who funded the budget');
      return;
    }

    setPending(true);
    setError(null);
    const resolve = loadingToast(hasBudget ? 'Adding income…' : 'Setting budget…');
    const result = await updateTripBudget(
      tripId,
      (budget ?? 0) + parsed,
      hasBudget ? activeCurrency : currency,
      nextPayerUserId
    );
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      resolve(result.error, 'error');
      return;
    }

    resolve(hasBudget ? 'Income added!' : 'Budget set!', 'success');
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[1rem] bg-stone-950/[0.03] px-4 py-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {hasBudget
          ? `Add more funds directly into the shared trip budget in ${activeCurrency}. Existing expenses stay unchanged.`
          : 'Set the starting shared budget for this trip before the crew begins logging expenses.'}
      </div>

      <div className="flex items-center gap-2">
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
            className="w-full rounded-xl border py-2.5 pl-8 pr-3 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
            placeholder="0"
            autoFocus
          />
        </div>

        {hasBudget ? (
          <div
            className="inline-flex min-h-[44px] items-center rounded-xl border px-3 text-sm font-medium"
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
            className="min-h-[44px] rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {CURRENCIES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )}
      </div>

      {showPayerField && (
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            Funded by
          </label>
          <select
            value={payerUserId}
            onChange={(e) => setPayerUserId(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile.display_name ?? member.user_id}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            The person who put the money into the trip fund.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {pending ? 'Saving…' : hasBudget ? 'Add income' : 'Set budget'}
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
