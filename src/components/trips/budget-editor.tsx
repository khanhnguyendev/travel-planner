'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { updateProjectBudget } from '@/features/trips/actions';
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
}

export function BudgetEditor({
  tripId,
  budget,
  budgetCurrency,
  budgetPayerUserId,
  canManage,
  totalSpent,
  members,
}: BudgetEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget != null ? String(budget) : '');
  const [currency, setCurrency] = useState(budgetCurrency || 'VND');
  const [payerUserId, setPayerUserId] = useState<string>(budgetPayerUserId ?? members[0]?.user_id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const parsed = value ? parseFloat(value) : null;
    if (value && (isNaN(parsed!) || parsed! <= 0)) {
      setError('Please enter a valid positive number');
      return;
    }
    if (parsed && !payerUserId) {
      setError('Please select who funded the budget');
      return;
    }
    setPending(true);
    setError(null);
    const result = await updateProjectBudget(tripId, parsed ?? null, currency, parsed ? payerUserId : null);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
  }

  function handleCancel() {
    setValue(budget != null ? String(budget) : '');
    setCurrency(budgetCurrency || 'VND');
    setPayerUserId(budgetPayerUserId ?? members[0]?.user_id ?? '');
    setError(null);
    setEditing(false);
  }

  // Display mode — no budget set
  if (!editing && budget == null) {
    if (!canManage) return null;
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs font-medium transition-colors hover:text-teal-700 cursor-pointer"
        style={{ color: 'var(--color-primary)' }}
      >
        + Set budget
      </button>
    );
  }

  const payerName = members.find((m) => m.user_id === budgetPayerUserId)?.profile.display_name ?? 'Someone';

  // Display mode — budget is set
  if (!editing && budget != null) {
    const spent = totalSpent;
    const pct = Math.min((spent / budget) * 100, 100);
    const remaining = budget - spent;
    const overBudget = spent > budget;
    const barColor =
      pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#14B8A6';

    return (
      <div
        className="rounded-xl px-4 py-3 mt-4"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Budget: {formatCurrency(budget, budgetCurrency)}
            </span>
            {canManage && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded transition-colors hover:bg-black/5 cursor-pointer"
                title="Edit budget"
              >
                <Pencil className="w-3 h-3" style={{ color: 'var(--color-text-subtle)' }} />
              </button>
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {formatCurrency(spent, budgetCurrency)} spent
          </span>
        </div>

        {budgetPayerUserId && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-subtle)' }}>
            Funded by <span className="font-medium">{payerName}</span>
          </p>
        )}

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            {Math.round(pct)}% used
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: overBudget ? '#EF4444' : 'var(--color-text-subtle)' }}
          >
            {overBudget
              ? `${formatCurrency(Math.abs(remaining), budgetCurrency)} over budget`
              : `${formatCurrency(remaining, budgetCurrency)} remaining`}
          </span>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div
      className="rounded-xl px-4 py-3 mt-4"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>
        {budget == null ? 'Set budget' : 'Edit budget'}
      </p>

      {/* Amount + currency row */}
      <div className="flex gap-2 items-center mb-3">
        <div className="relative flex-1">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
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
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none"
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
          className="px-2.5 py-2 rounded-lg border text-sm outline-none cursor-pointer"
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

      {/* Funded by */}
      <div className="mb-3">
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Funded by
        </label>
        <select
          value={payerUserId}
          onChange={(e) => setPayerUserId(e.target.value)}
          className="w-full px-2.5 py-2 rounded-lg border text-sm outline-none cursor-pointer"
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

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="btn-primary text-xs py-2 px-3 disabled:opacity-60 cursor-pointer"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          className="btn-secondary text-xs py-2 px-3 cursor-pointer"
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
