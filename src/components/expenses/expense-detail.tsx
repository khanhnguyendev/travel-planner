'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Receipt, Calendar, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import type { ExpenseWithSplits, ExpenseSplitWithProfile } from '@/features/expenses/queries';
import type { TripRole } from '@/lib/types';
import { deleteExpense } from '@/features/expenses/actions';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/avatar';

interface ExpenseDetailProps {
  expense: ExpenseWithSplits;
  tripId: string;
  projectTitle?: string;
  currentUserId: string;
  role: TripRole;
}

function StatusBadge({ status }: { status: string }) {
  const isSettled = status === 'settled';
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
        isSettled 
          ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm" 
          : "bg-amber-50 text-amber-600 border-amber-100 shadow-sm"
      )}
    >
      {isSettled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {status}
    </span>
  );
}

function SplitRow({
  split,
  expenseAmount,
  currency,
  canMarkSettled,
  onMarkSettled,
  isSettling,
}: {
  split: ExpenseSplitWithProfile;
  expenseAmount: number;
  currency: string;
  canMarkSettled: boolean;
  onMarkSettled: (splitId: string) => void;
  isSettling: boolean;
}) {
  const name = split.profile.display_name ?? 'Unknown';
  const pct = expenseAmount > 0
    ? ((split.amount_owed / expenseAmount) * 100).toFixed(0)
    : '0';
  const isSettled = split.status === 'settled';

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300",
        isSettled 
          ? "bg-emerald-50/30 border-emerald-100 opacity-80" 
          : "bg-white border-slate-100 hover:border-primary/20 hover:shadow-soft"
      )}
    >
      {/* Avatar */}
      <Avatar
        user={{ display_name: name, avatar_url: split.profile.avatar_url ?? null }}
        size="md"
      />

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className={cn(
            'font-display font-bold text-sm text-foreground mb-1',
            isSettled && 'line-through opacity-50'
          )}
        >
          {name}
        </div>
        <StatusBadge status={split.status} />
      </div>

      {/* Amounts */}
      <div className="text-right flex-shrink-0">
        <div className={cn(
            'font-display font-bold text-base text-foreground',
            isSettled && 'line-through opacity-50'
          )}
        >
          {formatCurrency(split.amount_owed, currency)}
        </div>
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
          {pct}% share
        </div>
      </div>

      {/* Mark settled button */}
      {canMarkSettled && split.status === 'pending' && (
        <button
          onClick={() => onMarkSettled(split.id)}
          disabled={isSettling}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all min-h-[36px] flex-shrink-0 ml-2',
            'bg-emerald-500 text-white hover:bg-emerald-600 shadow-button active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSettling ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {isSettling ? '...' : 'Settle'}
        </button>
      )}

      {/* Settled green checkmark badge */}
      {isSettled && (
        <div className="flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
      )}
    </div>
  );
}

export function ExpenseDetail({
  expense,
  tripId,
  projectTitle,
  currentUserId,
  role,
}: ExpenseDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [splits, setSplits] = useState<ExpenseSplitWithProfile[]>(expense.splits);
  const loadingToast = useLoadingToast();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const receiptUrl =
    expense.receipt_path && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/receipts/${expense.receipt_path}`
      : null;

  const isOwnerOrAdmin = ['owner', 'admin'].includes(role);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) return;
    setIsDeleting(true);
    const resolve = loadingToast('Deleting expense…');
    const result = await deleteExpense(expense.id);
    if (result.ok) {
      resolve('Expense deleted', 'success');
      router.push(`/trips/${tripId}/expenses`);
    } else {
      const msg = result.error ?? 'Failed to delete expense';
      resolve(msg, 'error');
      setIsDeleting(false);
    }
  }

  async function handleMarkSettled(splitId: string) {
    setSettlingId(splitId);
    const resolve = loadingToast('Marking as settled…');

    // Optimistic update
    setSplits((prev) =>
      prev.map((s) => (s.id === splitId ? { ...s, status: 'settled' as const } : s))
    );

    try {
      const res = await fetch('/api/expenses/splits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splitId, status: 'settled' }),
      });

      const data = (await res.json()) as { ok: boolean; error?: { message: string } };

      if (!res.ok || !data.ok) {
        // Rollback optimistic update
        setSplits((prev) =>
          prev.map((s) => (s.id === splitId ? { ...s, status: 'pending' as const } : s))
        );
        resolve(data.error?.message ?? 'Failed to update split', 'error');
      } else {
        resolve('Split marked as settled', 'success');
      }
    } catch {
      // Rollback
      setSplits((prev) =>
        prev.map((s) => (s.id === splitId ? { ...s, status: 'pending' as const } : s))
      );
      resolve('Failed to update split', 'error');
    } finally {
      setSettlingId(null);
    }
  }

  const paidByName = expense.paid_by_profile.display_name ?? 'Unknown member';
  const expenseDate = expense.expense_date
    ? formatDate(expense.expense_date)
    : formatDate(expense.created_at);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={expense.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: projectTitle ?? 'Trip', href: `/trips/${tripId}` },
          { label: 'Expenses', href: `/trips/${tripId}/expenses` },
          { label: expense.title },
        ]}
      />

      {/* Header card */}
      <div className="card-premium p-8 relative overflow-hidden">
        {/* Accent bar shifted to background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-primary shadow-sm" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 flex-wrap mt-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl shadow-sm">
                <Avatar
                  user={{
                    display_name: paidByName,
                    avatar_url: expense.paid_by_profile.avatar_url ?? null,
                  }}
                  size="sm"
                  className="ring-2 ring-white"
                />
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Paid by <span className="text-foreground">{paidByName}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary opacity-60" />
                {expenseDate}
              </div>

              {expense.category && (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-2xl">
                   {expense.category}
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-soft">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total</p>
            <div className="text-3xl font-display font-bold text-primary">
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            <p className="text-[11px] font-bold text-muted-foreground opacity-60 mt-0.5">{expense.currency}</p>
          </div>
        </div>

        {/* Note */}
        {expense.note && (
          <div
            className="mt-4 flex items-start gap-2 p-3 rounded-xl text-sm"
            style={{
              backgroundColor: 'var(--color-bg-subtle)',
              color: 'var(--color-text-muted)',
            }}
          >
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {expense.note}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-2 mt-5 pt-5 border-t"
          style={{ borderColor: 'var(--color-border-muted)' }}
        >
          <a
            href={`/trips/${tripId}/expenses/${expense.id}/edit`}
            className={cn(
              'inline-flex items-center gap-1.5 btn-secondary text-sm min-h-[44px]'
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
              'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Splits */}
      <div className="card p-6">
        <h2
          className="font-semibold text-base mb-4 text-stone-800"
        >
          How it&apos;s split
        </h2>

        {splits.length === 0 ? (
          <p className="text-sm text-stone-400">
            No splits recorded for this expense.
          </p>
        ) : (
          <div className="space-y-2">
            {splits.map((split) => {
              const canMarkSettled =
                split.user_id === currentUserId || isOwnerOrAdmin;
              return (
                <SplitRow
                  key={split.id}
                  split={split}
                  expenseAmount={expense.amount}
                  currency={expense.currency}
                  canMarkSettled={canMarkSettled}
                  onMarkSettled={handleMarkSettled}
                  isSettling={settlingId === split.id}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt */}
      {receiptUrl && (
        <div className="card p-6">
          <h2
            className="font-semibold text-base mb-4 flex items-center gap-2 text-stone-800"
          >
            <Receipt className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
            Receipt
          </h2>
          <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt="Receipt"
              className="w-full max-w-sm rounded-2xl object-contain border cursor-pointer hover:opacity-90 transition-opacity"
              style={{ borderColor: 'var(--color-border-muted)' }}
            />
          </a>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-subtle)' }}>
            Click to open full size
          </p>
        </div>
      )}
    </div>
  );
}
