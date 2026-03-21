'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Wallet, Users, CalendarDays } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import type { TripExpenseReport, MemberReportEntry } from '@/features/expenses/reports';
import type { BudgetContribution } from '@/lib/types';
import type { Trip } from '@/lib/types';

interface TripReportProps {
  report: TripExpenseReport;
  contributions: BudgetContribution[];
  trip: Trip;
  onClose: () => void;
}

export function TripReport({ report, contributions, trip, onClose }: TripReportProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) return null;

  const primaryCurrency = Object.keys(report.totalByCurrency)[0] ?? trip.budget_currency ?? 'VND';
  const totalContributed = contributions
    .filter((c) => c.currency === primaryCurrency)
    .reduce((sum, c) => sum + c.amount, 0);

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
          className="relative mx-auto flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem]"
          style={{ backgroundColor: 'var(--color-bg)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Trip expense report"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                Trip Report
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-stone-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Total spend */}
            <Section title="Total Spend" icon={<Wallet className="h-4 w-4" />}>
              <div className="flex flex-wrap gap-3">
                {Object.entries(report.totalByCurrency).map(([cur, total]) => {
                  const budget = trip.budget && trip.budget_currency === cur ? trip.budget : null;
                  const percent = budget ? Math.min(Math.round((total / budget) * 100), 100) : null;
                  return (
                    <div key={cur} className="flex-1 min-w-[140px] metric-tile rounded-xl p-4">
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                        {formatCurrency(total, cur)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                        {report.expenseCount} expense{report.expenseCount !== 1 ? 's' : ''}
                      </p>
                      {budget && percent !== null && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-subtle)' }}>
                            <span>Budget</span>
                            <span>{percent}% of {formatCurrency(budget, cur)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: percent >= 100 ? '#EF4444' : percent >= 80 ? '#F59E0B' : '#0D9488',
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {totalContributed > 0 && cur === primaryCurrency && (
                        <p className="text-xs mt-2" style={{ color: 'var(--color-text-subtle)' }}>
                          Pool: {formatCurrency(totalContributed, cur)} contributed
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Category breakdown */}
            {report.categoryBreakdown.length > 0 && (
              <Section title="By Category" icon={<CalendarDays className="h-4 w-4" />}>
                <div className="space-y-2">
                  {report.categoryBreakdown
                    .filter((c) => c.currency === primaryCurrency)
                    .map((entry) => (
                      <div key={`${entry.category}-${entry.currency}`} className="flex items-center gap-3">
                        <span className="w-6 text-center text-base">{entry.emoji}</span>
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
              </Section>
            )}

            {/* Members */}
            {report.memberBreakdown.length > 0 && (
              <Section title="By Member" icon={<Users className="h-4 w-4" />}>
                <div className="space-y-2">
                  {report.memberBreakdown
                    .filter((m) => m.currency === primaryCurrency)
                    .sort((a, b) => b.paid - a.paid)
                    .map((m) => (
                      <MemberRow key={m.userId} member={m} />
                    ))}
                </div>
              </Section>
            )}

            {/* Debts */}
            {report.debts.length > 0 && (
              <Section title="Outstanding Debts" icon={<Wallet className="h-4 w-4" />}>
                <div className="space-y-2">
                  {report.debts
                    .filter((d) => d.currency === primaryCurrency)
                    .map((d, i) => {
                      const fromMember = report.memberBreakdown.find((m) => m.userId === d.from);
                      const toMember = report.memberBreakdown.find((m) => m.userId === d.to);
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-xl p-3 metric-tile">
                          <Avatar
                            user={{ display_name: fromMember?.displayName ?? null, avatar_url: fromMember?.avatarUrl ?? null }}
                            size="sm"
                          />
                          <span className="text-sm flex-1" style={{ color: 'var(--color-text)' }}>
                            <span className="font-semibold">{fromMember?.displayName ?? 'Unknown'}</span>
                            <span style={{ color: 'var(--color-text-subtle)' }}> owes </span>
                            <span className="font-semibold">{toMember?.displayName ?? 'Unknown'}</span>
                          </span>
                          <span className="text-sm font-bold" style={{ color: '#EF4444' }}>
                            {formatCurrency(d.amount, d.currency)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </Section>
            )}

            {/* Daily spend */}
            {report.dailySpend.length > 1 && (
              <Section title="Daily Spend" icon={<CalendarDays className="h-4 w-4" />}>
                <DailyChart
                  entries={report.dailySpend.filter((d) => d.currency === primaryCurrency)}
                  currency={primaryCurrency}
                />
              </Section>
            )}

            {/* Top expenses */}
            {report.topExpenses.length > 0 && (
              <Section title="Top Expenses" icon={<TrendingUp className="h-4 w-4" />}>
                <div className="space-y-2">
                  {report.topExpenses.map((exp, i) => (
                    <div key={exp.id} className="flex items-center gap-3 rounded-xl p-3 metric-tile">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-subtle)' }}>
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                          {exp.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                          {exp.expense_date
                            ? formatDate(exp.expense_date)
                            : '—'}
                          {exp.category ? ` · ${exp.category}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--color-text)' }}>
                        {formatCurrency(exp.amount, exp.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </aside>
      </div>
    </>,
    document.body
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function MemberRow({ member }: { member: MemberReportEntry }) {
  const isPositive = member.net > 0;
  const isNegative = member.net < 0;
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 metric-tile">
      <Avatar
        user={{ display_name: member.displayName, avatar_url: member.avatarUrl }}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
          {member.displayName ?? 'Unknown'}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          Paid {formatCurrency(member.paid, member.currency)} · Share {formatCurrency(member.share, member.currency)}
        </p>
      </div>
      <span
        className="text-sm font-bold flex-shrink-0"
        style={{ color: isPositive ? '#0D9488' : isNegative ? '#EF4444' : 'var(--color-text-subtle)' }}
      >
        {isPositive ? '+' : ''}{formatCurrency(member.net, member.currency)}
      </span>
    </div>
  );
}

function DailyChart({ entries, currency }: { entries: { date: string; amount: number }[]; currency: string }) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e.amount));

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const percent = max > 0 ? (entry.amount / max) * 100 : 0;
        const label = formatDate(entry.date + 'T00:00:00');
        return (
          <div key={entry.date} className="flex items-center gap-3">
            <span className="w-14 flex-shrink-0 text-right text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              {label}
            </span>
            <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${percent}%`, backgroundColor: 'var(--color-primary)', opacity: 0.8 }}
              />
            </div>
            <span className="w-24 flex-shrink-0 text-right text-xs font-medium" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(entry.amount, currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
