'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Calendar, FileText, Receipt, Tag, User, Users, Wallet } from 'lucide-react';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDateAndTime, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORY_EMOJIS: Record<string, string> = {
  Accommodation: '🛏️',
  Entertainment: '🎤',
  Groceries: '🛒',
  Healthcare: '🦷',
  Insurance: '🧯',
  'Rent & Charges': '🏠',
  'Restaurants & Bars': '🍔',
  Shopping: '🛍️',
  Transport: '🚕',
  Other: '🤚',
};

interface ExpenseSummaryCardProps {
  expense: ExpenseWithSplits;
  linkedPlaceName?: string | null;
  href?: string;
  compact?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

function expenseMoment(expense: Pick<ExpenseWithSplits, 'expense_date' | 'created_at'>) {
  return expense.expense_date
    ? formatDateAndTime(expense.expense_date, expense.created_at)
    : formatDateTime(expense.created_at);
}

function AvatarStack({
  members,
  size = 'sm',
}: {
  members: ExpenseWithSplits['splits'];
  size?: 'sm' | 'md';
}) {
  if (members.length === 0) {
    return (
      <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
        No split members
      </span>
    );
  }

  const preview = members.slice(0, 4);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-2">
        {preview.map((member) => (
          <div key={member.id} className="rounded-full border-2 border-white">
            <Avatar
              user={{
                display_name: member.profile.display_name ?? 'Member',
                avatar_url: member.profile.avatar_url,
              }}
              size={size}
            />
          </div>
        ))}
      </div>
      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {members.length} member{members.length === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function MetaBlock({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1rem] bg-white/72 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-subtle)' }}>
        {icon}
        {label}
      </p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function ExpenseSummaryInner({
  expense,
  linkedPlaceName,
  compact,
}: {
  expense: ExpenseWithSplits;
  linkedPlaceName?: string | null;
  compact: boolean;
}) {
  const payerName = expense.paid_by_profile.display_name ?? 'Unknown member';
  const notePreview = expense.note?.trim() ?? '';
  const hasNote = notePreview.length > 0;
  const chips = [
    expense.category ? {
      key: 'category',
      icon: EXPENSE_CATEGORY_EMOJIS[expense.category] ?? null,
      label: expense.category,
      bg: '#FEF3C7',
      text: '#92400E',
    } : null,
    linkedPlaceName ? {
      key: 'place',
      icon: null,
      label: linkedPlaceName,
      bg: '#EFF6FF',
      text: '#2563EB',
    } : null,
    expense.paid_from_pool ? {
      key: 'pool',
      icon: null,
      label: 'Shared pool',
      bg: '#CCFBF1',
      text: '#0F766E',
    } : null,
    expense.receipt_path ? {
      key: 'receipt',
      icon: null,
      label: 'Receipt',
      bg: '#F1F5F9',
      text: '#475569',
    } : null,
  ].filter(Boolean) as Array<{ key: string; icon: string | null; label: string; bg: string; text: string }>;

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: chip.bg, color: chip.text }}
              >
                {chip.icon ? <span>{chip.icon}</span> : null}
                {chip.label}
              </span>
            ))}
          </div>
          <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug section-title sm:text-lg" style={{ color: 'var(--color-text)' }}>
            {expense.title}
          </h3>
          {hasNote && (
            <p className={cn('mt-2 text-sm leading-relaxed', compact ? 'line-clamp-2' : 'line-clamp-3')} style={{ color: 'var(--color-text-muted)' }}>
              {notePreview}
            </p>
          )}
        </div>

        <div className="rounded-[1rem] bg-white/85 px-3 py-3 text-left shadow-sm sm:min-w-[164px] sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-subtle)' }}>
            Total
          </p>
          <p className="mt-1 text-lg font-semibold sm:text-[1.35rem]" style={{ color: 'var(--color-primary)' }}>
            {formatCurrency(expense.amount, expense.currency)}
          </p>
        </div>
      </div>

      <div className={cn('mt-4 grid gap-3', compact ? 'lg:grid-cols-2' : 'sm:grid-cols-2')}>
        <MetaBlock label="Used For" icon={<Tag className="h-3.5 w-3.5" />}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {expense.title}
          </p>
          <div className="mt-1 space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {expense.category && <p>Category: {expense.category}</p>}
            {linkedPlaceName ? <p>Place: {linkedPlaceName}</p> : <p>No place linked</p>}
          </div>
        </MetaBlock>

        <MetaBlock label="Paid By" icon={expense.paid_from_pool ? <Wallet className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}>
          {expense.paid_from_pool ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Shared pool
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Covered by trip funds
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar
                user={{
                  display_name: payerName,
                  avatar_url: expense.paid_by_profile.avatar_url,
                }}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {payerName}
                </p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Paid the upfront amount
                </p>
              </div>
            </div>
          )}
        </MetaBlock>

        <MetaBlock label="Split With" icon={<Users className="h-3.5 w-3.5" />}>
          <AvatarStack members={expense.splits} size={compact ? 'sm' : 'md'} />
          {expense.splits.length > 0 && (
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {expense.splits.length === 1 ? 'One person shares this bill' : 'Shared across the listed members'}
            </p>
          )}
        </MetaBlock>

        <MetaBlock label="Recorded" icon={<Calendar className="h-3.5 w-3.5" />}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {expenseMoment(expense)}
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Unified trip timestamp
          </p>
        </MetaBlock>
      </div>

      {expense.receipt_path && !compact && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-sm font-medium shadow-sm" style={{ color: 'var(--color-text-muted)' }}>
          <Receipt className="h-4 w-4" />
          Receipt attached
        </div>
      )}

      {!hasNote && !compact && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <FileText className="h-4 w-4" />
          No extra note added
        </div>
      )}
    </div>
  );
}

export function ExpenseSummaryCard({
  expense,
  linkedPlaceName,
  href,
  compact = false,
  selected = false,
  disabled = false,
  onClick,
  className,
}: ExpenseSummaryCardProps) {
  const containerClassName = cn(
    'group relative block min-w-0 overflow-hidden rounded-[1.35rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(245,244,239,0.88))] p-4 shadow-[0_18px_34px_rgba(87,67,40,0.06)] transition-all',
    compact ? 'sm:p-4' : 'sm:p-5',
    !disabled && 'hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(87,67,40,0.10)]',
    selected && 'ring-2 ring-teal-500',
    disabled && 'pointer-events-none opacity-50',
    className
  );

  const content = (
    <ExpenseSummaryInner
      expense={expense}
      linkedPlaceName={linkedPlaceName}
      compact={compact}
    />
  );

  if (href) {
    return (
      <Link href={href} className={containerClassName}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(containerClassName, 'w-full text-left')}>
        {content}
      </button>
    );
  }

  return <div className={containerClassName}>{content}</div>;
}
