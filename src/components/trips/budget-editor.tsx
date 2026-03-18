'use client';

import { useState } from 'react';
import { Pencil, PiggyBank, Save, X, ChevronDown } from 'lucide-react';
import { updateProjectBudget } from '@/features/trips/actions';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
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
        className="inline-flex items-center gap-2 group px-4 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all border border-primary/20"
      >
        <PiggyBank className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">+ Set Trip Budget</span>
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
      pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';

    return (
      <div className="rounded-2xl p-6 mt-6 bg-slate-50/50 border border-slate-100/80 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Trip Budget</p>
              <h4 className="font-display font-bold text-lg text-foreground">
                {formatCurrency(budget, budgetCurrency)}
              </h4>
            </div>
            {canManage && (
              <button
                onClick={() => setEditing(true)}
                className="p-2 rounded-lg transition-all hover:bg-white hover:shadow-soft text-muted-foreground hover:text-primary group"
                title="Edit budget"
              >
                <Pencil className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Spent so far</p>
            <p className="font-display font-bold text-lg text-foreground">
              {formatCurrency(spent, budgetCurrency)}
            </p>
          </div>
        </div>

        {budgetPayerUserId && (
          <p className="text-xs mb-3 text-muted-foreground">
            Funded by <span className="font-bold text-foreground">{payerName}</span>
          </p>
        )}

        {/* Progress bar container */}
        <div className="relative h-3 rounded-full bg-slate-200/50 overflow-hidden shadow-inner">
          <div
            className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white px-2 py-0.5 rounded-md border border-slate-100 shadow-sm">
            {Math.round(pct)}% used
          </span>
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-sm",
            overBudget 
              ? "bg-red-50 text-red-600 border-red-100" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          )}>
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
    <div className="rounded-2xl p-6 mt-6 bg-white border border-slate-200 shadow-premium animate-in slide-in-from-top-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Pencil className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="font-display font-bold text-lg text-foreground">
            {budget == null ? 'Initialize Budget' : 'Adjust Budget'}
          </h4>
          <p className="text-xs text-muted-foreground">Define your spending limits for this trip.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1">
            Budget Amount
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1 group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground/50 transition-colors group-focus-within:text-primary">
                {CURRENCY_SYMBOLS[currency] ?? currency}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none text-sm font-bold"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:border-primary transition-all outline-none text-sm font-bold bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1">
            Funded By
          </label>
          <div className="relative">
            <select
              value={payerUserId}
              onChange={(e) => setPayerUserId(e.target.value)}
              className="appearance-none w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:border-primary transition-all outline-none text-sm font-bold bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option value="" disabled>Select member</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile.display_name ?? 'Team Member'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={pending}
          className="btn-premium flex-1 py-3 justify-center gap-2"
        >
          {pending ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {pending ? 'Saving...' : 'Confirm Budget'}
        </button>
        <button
          onClick={handleCancel}
          className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-all flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Discard
        </button>
      </div>

      {error && (
        <p className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wide border border-red-100 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
