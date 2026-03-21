'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import type { UserTransactionReport } from '@/features/expenses/reports';

interface UserTransactionReportProps {
  report: UserTransactionReport;
  onClose: () => void;
}

export function UserTransactionReportDrawer({ report, onClose }: UserTransactionReportProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return null;

  const currencies = Array.from(
    new Set([
      ...Object.keys(report.totalPaidByCurrency),
      ...Object.keys(report.totalPendingByCurrency),
      ...Object.keys(report.totalSettledByCurrency),
    ])
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center overflow-x-hidden px-2 py-3 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <aside
          className="relative mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[1.5rem]"
          style={{ backgroundColor: 'var(--color-bg)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`${report.displayName ?? 'User'}'s transactions`}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <Avatar
                user={{ display_name: report.displayName, avatar_url: report.avatarUrl }}
                size="md"
              />
              <div>
                <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                  {report.displayName ?? 'Unknown'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  Transaction summary
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-stone-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Summary stats */}
            {currencies.map((cur) => {
              const paid = report.totalPaidByCurrency[cur] ?? 0;
              const pending = report.totalPendingByCurrency[cur] ?? 0;
              const settled = report.totalSettledByCurrency[cur] ?? 0;
              const contributed = report.totalContributedByCurrency[cur] ?? 0;
              const net = report.netByCurrency[cur] ?? 0;
              const isPositive = net > 0;
              const isNegative = net < 0;

              return (
                <div key={cur} className="space-y-3">
                  {currencies.length > 1 && (
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-subtle)' }}>
                      {cur}
                    </p>
                  )}

                  {/* Net balance hero */}
                  <div className="metric-tile rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>Net balance</p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: isPositive ? '#0D9488' : isNegative ? '#EF4444' : 'var(--color-text)' }}
                      >
                        {isPositive ? '+' : ''}{formatCurrency(net, cur)}
                      </p>
                    </div>
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: isPositive ? '#f0fdf4' : isNegative ? '#fef2f2' : 'var(--color-bg-subtle)' }}
                    >
                      <TrendingUp
                        className="h-5 w-5"
                        style={{ color: isPositive ? '#0D9488' : isNegative ? '#EF4444' : 'var(--color-text-subtle)' }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <StatCard
                      label="Paid out"
                      value={formatCurrency(paid, cur)}
                      icon={<Wallet className="h-3.5 w-3.5" />}
                      color="teal"
                    />
                    {contributed > 0 && (
                      <StatCard
                        label="Pool contributed"
                        value={formatCurrency(contributed, cur)}
                        icon={<Wallet className="h-3.5 w-3.5" />}
                        color="indigo"
                      />
                    )}
                    <StatCard
                      label="Owes (pending)"
                      value={formatCurrency(pending, cur)}
                      icon={<Clock className="h-3.5 w-3.5" />}
                      color="amber"
                    />
                    <StatCard
                      label="Already settled"
                      value={formatCurrency(settled, cur)}
                      icon={<CheckCircle className="h-3.5 w-3.5" />}
                      color="stone"
                    />
                  </div>
                </div>
              );
            })}

            {/* Category breakdown */}
            {report.categoryBreakdown.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Spend by category
                </p>
                <div className="space-y-2">
                  {report.categoryBreakdown.map((entry) => (
                    <div key={`${entry.category}-${entry.currency}`} className="flex items-center gap-3">
                      <span className="w-6 text-center text-base flex-shrink-0">{entry.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                            {entry.category}
                          </span>
                          <span className="text-sm font-semibold ml-2 flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                            {formatCurrency(entry.amount, entry.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${entry.percent}%`, backgroundColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }}>
                            {entry.percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid expenses */}
            {report.paidExpenses.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Expenses paid
                </p>
                <div className="space-y-2">
                  {report.paidExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center gap-3 rounded-xl p-3 metric-tile">
                      <span className="text-base flex-shrink-0">
                        {exp.category
                          ? (
                              {
                                Accommodation: '🛏️', Entertainment: '🎤', Groceries: '🛒',
                                Healthcare: '🦷', Insurance: '🧯', 'Rent & Charges': '🏠',
                                'Restaurants & Bars': '🍔', Shopping: '🛍️', Transport: '🚕',
                              }[exp.category] ?? '💸'
                            )
                          : '💸'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {exp.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                          {exp.expense_date
                            ? new Date(exp.expense_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : '—'}
                          {' · '}{exp.splits.length} split{exp.splits.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                        {formatCurrency(exp.amount, exp.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.paidExpenses.length === 0 && Object.keys(report.totalPendingByCurrency).length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                  No transactions yet for this member.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>,
    document.body
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'teal' | 'indigo' | 'amber' | 'stone';
}) {
  const colorMap = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
    stone: { bg: 'bg-stone-100', text: 'text-stone-600' },
  };
  const { bg, text } = colorMap[color];

  return (
    <div className="metric-tile rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${bg} ${text}`}>
          {icon}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          {label}
        </span>
      </div>
      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
        {value}
      </p>
    </div>
  );
}
