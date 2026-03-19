'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Receipt, CheckCircle2 } from 'lucide-react';
import type { ExpenseWithSplits, ExpenseSplitWithProfile } from '@/features/expenses/queries';
import type { TripRole } from '@/lib/types';
import { deleteExpense } from '@/features/expenses/actions';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { Avatar } from '@/components/ui/avatar';
import { ExpenseSummaryCard } from '@/components/expenses/expense-summary-card';

interface ExpenseDetailProps {
  expense: ExpenseWithSplits;
  tripId: string;
  tripTitle?: string;
  linkedPlaceName?: string | null;
  currentUserId: string;
  role: TripRole;
}

function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isPending ? '#FEF3C7' : 'var(--color-primary-light)',
        color: isPending ? '#92400E' : 'var(--color-primary)',
      }}
    >
      {!isPending && <CheckCircle2 className="w-3 h-3" />}
      {isPending ? 'Unpaid' : 'Paid'}
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
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ backgroundColor: isSettled ? '#F0FDF4' : 'var(--color-bg-subtle)' }}
    >
      {/* Avatar */}
      <Avatar
        user={{ display_name: name, avatar_url: split.profile.avatar_url ?? null }}
        size="md"
      />

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'font-medium text-sm truncate',
            isSettled && 'line-through opacity-60'
          )}
          style={{ color: 'var(--color-text)' }}
        >
          {name}
        </div>
        <StatusBadge status={split.status} />
      </div>

      {/* Amounts */}
      <div className="text-right flex-shrink-0">
        <div
          className={cn(
            'font-semibold text-sm',
            isSettled && 'line-through opacity-60'
          )}
          style={{ color: 'var(--color-text)' }}
        >
          {formatCurrency(split.amount_owed, currency)}
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          {pct}%
        </div>
      </div>

      {/* Mark settled button */}
      {canMarkSettled && split.status === 'pending' && (
        <button
          onClick={() => onMarkSettled(split.id)}
          disabled={isSettling}
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px] flex-shrink-0',
            'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          title="Mark as paid"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isSettling ? 'Saving…' : 'Mark as paid'}
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
  tripTitle,
  linkedPlaceName,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={expense.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: tripTitle ?? 'Trip', href: `/trips/${tripId}` },
          { label: 'Expenses', href: `/trips/${tripId}/expenses` },
          { label: expense.title },
        ]}
      />

      <div className="space-y-4">
        <ExpenseSummaryCard expense={expense} linkedPlaceName={linkedPlaceName} />

        <div className="card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
                Expense actions
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Update the details or remove this entry from the shared ledger.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <a
            href={`/trips/${tripId}/expenses/${expense.id}/edit`}
            className={cn('inline-flex min-h-[44px] items-center justify-center gap-1.5 btn-secondary text-sm')}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </a>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
            </div>
          </div>
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
