'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Receipt, User, Calendar, FileText } from 'lucide-react';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { deleteExpense } from '@/features/expenses/actions';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';

interface ExpenseDetailProps {
  expense: ExpenseWithSplits;
  projectId: string;
  projectTitle?: string;
}

function StatusBadge({ status }: { status: string }) {
  const isPending = status === 'pending';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{
        backgroundColor: isPending ? 'var(--color-secondary-light)' : 'var(--color-primary-light)',
        color: isPending ? 'var(--color-secondary)' : 'var(--color-primary)',
      }}
    >
      {status}
    </span>
  );
}

export function ExpenseDetail({ expense, projectId, projectTitle }: ExpenseDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const loadingToast = useLoadingToast();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const receiptUrl =
    expense.receipt_path && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/receipts/${expense.receipt_path}`
      : null;

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) return;
    setIsDeleting(true);
    const resolve = loadingToast('Deleting expense…');
    const result = await deleteExpense(expense.id);
    if (result.ok) {
      resolve('Expense deleted', 'success');
      router.push(`/projects/${projectId}/expenses`);
    } else {
      const msg = result.error ?? 'Failed to delete expense';
      resolve(msg, 'error');
      setIsDeleting(false);
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
          { label: projectTitle ?? 'Trip', href: `/projects/${projectId}` },
          { label: 'Expenses', href: `/projects/${projectId}/expenses` },
          { label: expense.title },
        ]}
      />

      {/* Header card */}
      <div className="card p-6">
        {/* Teal accent bar */}
        <div
          className="h-1.5 rounded-t-2xl -mx-6 -mt-6 mb-5"
          style={{ backgroundColor: 'var(--color-primary)' }}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Meta */}
            <div className="flex items-center gap-4 flex-wrap mt-1">
              <span
                className="inline-flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <User className="w-4 h-4" />
                Paid by <strong className="ml-0.5" style={{ color: 'var(--color-text)' }}>{paidByName}</strong>
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Calendar className="w-4 h-4" />
                {expenseDate}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <div
              className="text-3xl font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              {formatCurrency(expense.amount, expense.currency)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
              {expense.currency}
            </div>
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
            href={`/projects/${projectId}/expenses/${expense.id}/edit`}
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

        {expense.splits.length === 0 ? (
          <p className="text-sm text-stone-400">
            No splits recorded for this expense.
          </p>
        ) : (
          <div className="space-y-2">
            {expense.splits.map((split) => {
              const name = split.profile.display_name ?? 'Unknown';
              const pct = expense.amount > 0
                ? ((split.amount_owed / expense.amount) * 100).toFixed(0)
                : '0';
              return (
                <div
                  key={split.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--color-bg-subtle)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + status */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-medium text-sm truncate"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {name}
                    </div>
                    <StatusBadge status={split.status} />
                  </div>

                  {/* Amounts */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="font-semibold text-sm"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {formatCurrency(split.amount_owed, expense.currency)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      {pct}%
                    </div>
                  </div>
                </div>
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
