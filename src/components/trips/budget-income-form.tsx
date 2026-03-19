'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { addBudgetContribution } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';
import type { MemberWithProfile } from '@/features/members/queries';
import { formatNumericInput, parseNumericInput } from '@/lib/format';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: 'EUR', VND: '₫', GBP: '£', JPY: '¥', THB: '฿',
};

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

interface BudgetIncomeFormProps {
  tripId: string;
  budgetCurrency: string;
  members: MemberWithProfile[];
  currentUserId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BudgetIncomeForm({
  tripId,
  budgetCurrency,
  members,
  currentUserId,
  onSuccess,
  onCancel,
}: BudgetIncomeFormProps) {
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState(budgetCurrency || 'VND');
  const [contributorId, setContributorId] = useState(currentUserId || members[0]?.user_id || '');
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsed = value ? parseNumericInput(value) : NaN;
    if (!value || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid positive number');
      return;
    }
    if (!contributorId) {
      setError('Please select who is adding the funds');
      return;
    }

    setPending(true);
    setError(null);
    const resolve = loadingToast('Adding income…');
    const result = await addBudgetContribution(tripId, parsed, currency, contributorId, note || null);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      resolve(result.error, 'error');
      return;
    }

    resolve('Income added!', 'success');
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="rounded-[1rem] bg-stone-950/[0.03] px-3 py-3 text-sm leading-relaxed sm:px-4" style={{ color: 'var(--color-text-muted)' }}>
        Record funds added to the shared trip budget. Each contribution is tracked separately.
      </div>

      <div className="min-w-0 space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Amount
        </label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              {CURRENCY_SYMBOLS[currency] ?? currency}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(formatNumericInput(e.target.value))}
              className="w-full min-w-0 rounded-xl border py-2.5 pl-8 pr-3 text-sm outline-none"
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
            className="min-h-[44px] w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none sm:w-auto sm:min-w-[96px]"
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
        </div>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Added by
        </label>
        <select
          value={contributorId}
          onChange={(e) => setContributorId(e.target.value)}
          className="w-full min-h-[44px] min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'white',
            color: 'var(--color-text)',
          }}
        >
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.profile.display_name ?? member.user_id}
              {member.user_id === currentUserId ? ' (you)' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          The person putting this money into the trip fund.
        </p>
      </div>

      <div className="min-w-0">
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          Note <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Initial deposit, Transport fund…"
          className="w-full min-w-0 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'white',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60 sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {pending ? 'Saving…' : 'Add income'}
        </button>
        <button
          type="button"
          onClick={() => onCancel?.()}
          className="btn-secondary w-full text-sm sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
