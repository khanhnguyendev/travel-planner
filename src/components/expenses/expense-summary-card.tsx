'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Receipt, Wallet, MapPin, FileText, ExternalLink, Pencil, Trash2, Car, Bus, Plane } from 'lucide-react';
import type { ExpenseWithSplits } from '@/features/expenses/queries';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDateTime, formatDate, formatFullDateTime } from '@/lib/format';
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
  linkedTransportName?: string | null;
  linkedTransportType?: 'rent' | 'bus' | 'plane' | null;
  /** Link to the full detail page. Shown inside the expanded section. */
  href?: string;
  compact?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  tripId?: string;
  canModify?: boolean;
  onDelete?: (id: string) => void;
}

// -------------------------------------------------------
// Collapsed row — single tight line
// -------------------------------------------------------

function CollapsedRow({
  expense,
  linkedPlaceName,
  linkedTransportName,
  linkedTransportType,
  expanded,
  onToggle,
}: {
  expense: ExpenseWithSplits;
  linkedPlaceName?: string | null;
  linkedTransportName?: string | null;
  linkedTransportType?: 'rent' | 'bus' | 'plane' | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const emoji = expense.category ? EXPENSE_CATEGORY_EMOJIS[expense.category] : null;
  const payerName = expense.paid_by_profile.display_name ?? 'Unknown';
  const date = expense.expense_date
    ? formatDate(expense.expense_date.slice(0, 10) + 'T00:00:00')
    : formatDateTime(expense.created_at);
  const splitCount = expense.splits.length;
  const previewSplits = expense.splits.slice(0, 3);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {/* Icon */}
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg leading-none"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
      >
        {emoji
          ? <span>{emoji}</span>
          : expense.paid_from_pool
            ? <Wallet className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
            : <Receipt className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        }
      </div>

      {/* Middle: title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {expense.title}
          </p>
          {linkedPlaceName && (
            <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              <MapPin className="h-2.5 w-2.5" />
              {linkedPlaceName}
            </span>
          )}
          {linkedTransportName && (
            <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
              {linkedTransportType === 'rent' ? <Car className="h-2.5 w-2.5" /> : linkedTransportType === 'bus' ? <Bus className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
              {linkedTransportName}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-col gap-1 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {expense.paid_from_pool ? (
              <span className="font-medium shrink-0" style={{ color: 'var(--color-primary)' }}>Pool</span>
            ) : (
              <span className="truncate max-w-[100px] sm:max-w-none">{payerName}</span>
            )}
            <span className="opacity-40">·</span>
            <span className="shrink-0">{formatDate(expense.expense_date ?? expense.created_at)}</span>
          </div>

          {splitCount > 0 && (
            <div className="flex shrink-0 items-center -space-x-1.5 px-0.5">
              {previewSplits.map((s) => (
                <div key={s.id} className="rounded-full border border-white shrink-0">
                  <Avatar
                    user={{ display_name: s.profile.display_name ?? 'M', avatar_url: s.profile.avatar_url }}
                    size="xs"
                  />
                </div>
              ))}
              {splitCount > 3 && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white bg-stone-100 text-[9px] font-semibold text-stone-500">
                  +{splitCount - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: amount + payer avatar + toggle */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
          {formatCurrency(expense.amount, expense.currency)}
        </span>
        <Avatar
          user={{ display_name: payerName, avatar_url: expense.paid_by_profile.avatar_url }}
          size="xs"
        />
        <button
          type="button"
          onClick={onToggle}
          className="rounded-lg p-1 transition-colors hover:bg-black/[0.05]"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
            style={{ color: 'var(--color-text-subtle)' }}
          />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
function ExpandedPanel({
  expense,
  linkedPlaceName,
  linkedTransportName,
  linkedTransportType,
  href,
  tripId,
  canModify,
  onDelete,
}: {
  expense: ExpenseWithSplits;
  linkedPlaceName?: string | null;
  linkedTransportName?: string | null;
  linkedTransportType?: 'rent' | 'bus' | 'plane' | null;
  href?: string;
  tripId?: string;
  canModify?: boolean;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="border-t px-3 pb-3 pt-2.5" style={{ borderColor: 'var(--color-border-muted)' }}>
      {/* Split breakdown */}
      {expense.splits.length > 0 && (
        <div className="mb-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--color-text-subtle)' }}>
            Split
          </p>
          <div className="space-y-1">
            {expense.splits.map((s) => {
              const pct = expense.amount > 0 ? Math.round((s.amount_owed / expense.amount) * 100) : 0;
              const isSettled = s.status === 'settled';
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <Avatar
                    user={{ display_name: s.profile.display_name ?? 'M', avatar_url: s.profile.avatar_url }}
                    size="xs"
                  />
                  <span
                    className={cn('flex-1 text-xs truncate', isSettled && 'line-through opacity-50')}
                    style={{ color: 'var(--color-text)' }}
                  >
                    {s.profile.display_name ?? 'Member'}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{pct}%</span>
                  <span
                    className={cn('text-xs font-semibold tabular-nums flex-shrink-0', isSettled && 'line-through opacity-50')}
                    style={{ color: isSettled ? 'var(--color-text-subtle)' : 'var(--color-text)' }}
                  >
                    {formatCurrency(s.amount_owed, expense.currency)}
                  </span>
                  {isSettled && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-green-600">✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note */}
      {expense.note && (
        <div className="mb-2.5 flex items-start gap-1.5 rounded-lg px-2.5 py-2" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
          <FileText className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--color-text-muted)' }}>
            {expense.note}
          </p>
        </div>
      )}

      {/* Footer: date + place + receipt + detail link */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
          {formatFullDateTime(expense.expense_date ?? expense.created_at)}
        </span>

        {linkedPlaceName && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <MapPin className="h-2.5 w-2.5" />
            {linkedPlaceName}
          </span>
        )}
        {linkedTransportName && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
            {linkedTransportType === 'rent' ? <Car className="h-2.5 w-2.5" /> : linkedTransportType === 'bus' ? <Bus className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
            {linkedTransportName}
          </span>
        )}

        {expense.receipt_path && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
            <Receipt className="h-2.5 w-2.5" />
            Receipt
          </span>
        )}

        {expense.paid_from_pool && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#CCFBF1', color: '#0F766E' }}>
            <Wallet className="h-2.5 w-2.5" />
            Shared pool
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {canModify && (
            <>
              <Link
                href={`/trips/${tripId}/expenses/${expense.id}/edit`}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(expense.id);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </>
          )}

          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              View details
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// ExpenseSummaryCard
// -------------------------------------------------------

export function ExpenseSummaryCard({
  expense,
  linkedPlaceName,
  linkedTransportName,
  linkedTransportType,
  href,
  compact = false,
  selected = false,
  disabled = false,
  onClick,
  className,
  tripId,
  canModify,
  onDelete,
}: ExpenseSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const containerClassName = cn(
    'group relative min-w-0 overflow-hidden border bg-white transition-all',
    compact ? 'rounded-[1rem]' : 'rounded-[1.1rem] shadow-[0_10px_24px_rgba(87,67,40,0.05)]',
    selected
      ? 'border-teal-400 ring-2 ring-teal-400/30'
      : 'border-stone-200/80',
    !disabled && 'hover:border-stone-300 hover:shadow-sm',
    disabled && 'pointer-events-none opacity-50',
    className
  );

  // In select mode or with an onClick handler, the whole row is a button
  if (onClick) {
    return (
      <div className={containerClassName}>
        <button type="button" onClick={onClick} className="w-full text-left">
          <CollapsedRow
            expense={expense}
            linkedPlaceName={linkedPlaceName}
            linkedTransportName={linkedTransportName}
            linkedTransportType={linkedTransportType}
            expanded={false}
            onToggle={() => { }}
          />
        </button>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <CollapsedRow
        expense={expense}
        linkedPlaceName={linkedPlaceName}
        linkedTransportName={linkedTransportName}
        linkedTransportType={linkedTransportType}
        expanded={expanded}
        onToggle={() => {
          if (!disabled) setExpanded((v) => !v);
        }}
      />
      {expanded && (
        <ExpandedPanel
          expense={expense}
          linkedPlaceName={linkedPlaceName}
          linkedTransportName={linkedTransportName}
          linkedTransportType={linkedTransportType}
          href={href}
          tripId={tripId}
          canModify={canModify}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
