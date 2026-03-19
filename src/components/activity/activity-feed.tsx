'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock3,
  Coins,
  Compass,
  LogIn,
  LogOut,
  MapPin,
  MessageCircle,
  Receipt,
  Tag,
  ThumbsDown,
  ThumbsUp,
  UserMinus,
  UserPlus,
  UserRound,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { ActivityEntry } from '@/features/activity/queries';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

// -------------------------------------------------------
// Label helpers
// -------------------------------------------------------

function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-stone-900">{children}</strong>;
}

function Amt({ children }: { children: ReactNode }) {
  return <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{children}</span>;
}

function fmtAmount(amount: unknown, currency: unknown): string {
  if (typeof amount === 'number' && typeof currency === 'string') {
    return formatCurrency(amount, currency);
  }
  return 'funds';
}

function fmtDate(dateStr: unknown): string {
  if (typeof dateStr !== 'string') return '';
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function getString(meta: Record<string, unknown> | null, key: string): string | null {
  const value = meta?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getNumber(meta: Record<string, unknown> | null, key: string): number | null {
  const value = meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatActionKey(action: string): string {
  return action
    .split('.')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function formatPlanningRange(meta: Record<string, unknown> | null): string | null {
  const startDate = getString(meta, 'startDate');
  const endDate = getString(meta, 'endDate');
  if (!startDate && !endDate) return null;
  if (!startDate) return fmtDate(endDate);
  if (!endDate) return fmtDate(startDate);
  return `${fmtDate(startDate)} - ${fmtDate(endDate)}`;
}

type DetailFact = {
  label: string;
  value: string;
  tone?: 'default' | 'primary';
};

type SummaryChip = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  bg: string;
  color: string;
};

// -------------------------------------------------------
// Per-action config
// -------------------------------------------------------

const ACTION_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  label: (meta: Record<string, unknown> | null) => ReactNode;
  detail?: (meta: Record<string, unknown> | null) => ReactNode | null;
}> = {
  'trip.create': {
    icon: Compass,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: () => 'created this trip',
  },
  'place.add': {
    icon: MapPin,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => (
      <>added <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B> to the itinerary</>
    ),
    detail: (m) => m?.address ? <span>{String(m.address)}</span> : null,
  },
  'place.delete': {
    icon: MapPin,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => (
      <>removed <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B> from the itinerary</>
    ),
  },
  'comment.add': {
    icon: MessageCircle,
    color: '#6366F1',
    bg: '#EEF2FF',
    label: (m) => (
      <>commented on <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>
    ),
    detail: (m) => m?.body != null ? (
      <span className="italic text-stone-500">&ldquo;{String(m.body)}&rdquo;</span>
    ) : null,
  },
  'vote.upvote': {
    icon: ThumbsUp,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => (
      <>upvoted <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>
    ),
  },
  'vote.downvote': {
    icon: ThumbsDown,
    color: '#F97316',
    bg: '#FFF7ED',
    label: (m) => (
      <>downvoted <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>
    ),
  },
  'trip.date_update': {
    icon: CalendarDays,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => {
      if (!m?.startDate) return 'updated trip dates';
      const start = fmtDate(m.startDate);
      const end = m.endDate ? ` – ${fmtDate(m.endDate)}` : '';
      return <>updated trip dates to <B>{start}{end}</B></>;
    },
  },
  'expense.add': {
    icon: Receipt,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    label: (m) => (
      <>
        added expense <B>&ldquo;{String(m?.title ?? 'Untitled')}&rdquo;</B>
        {m?.amount != null && <> · <Amt>{fmtAmount(m.amount, m.currency)}</Amt></>}
      </>
    ),
  },
  'expense.delete': {
    icon: Receipt,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => (
      <>
        removed expense <B>&ldquo;{String(m?.title ?? 'Untitled')}&rdquo;</B>
        {m?.amount != null && <> · <Amt>{fmtAmount(m.amount, m.currency)}</Amt></>}
      </>
    ),
  },
  'category.add': {
    icon: Tag,
    color: '#EC4899',
    bg: '#FDF2F8',
    label: (m) => (
      <>created category <B>&ldquo;{String(m?.name ?? '')}&rdquo;</B></>
    ),
  },
  'member.join': {
    icon: UserPlus,
    color: '#3B82F6',
    bg: '#EFF6FF',
    label: (m) => (
      <>joined the trip{m?.role ? <> as <B>{String(m.role)}</B></> : ''}</>
    ),
  },
  'place.checkin': {
    icon: LogIn,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => (
      <>checked in at <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>
    ),
  },
  'place.checkout': {
    icon: LogOut,
    color: '#6B7280',
    bg: '#F9FAFB',
    label: (m) => (
      <>checked out of <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>
    ),
  },
  'budget.contribute': {
    icon: Coins,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) {
        return <>recorded {amt} income for <B>{String(m.contributorName)}</B></>;
      }
      return <>added {amt} to the trip fund</>;
    },
  },
  'budget.edit': {
    icon: Coins,
    color: '#6366F1',
    bg: '#EEF2FF',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) {
        return <>updated income to {amt} for <B>{String(m.contributorName)}</B></>;
      }
      return <>updated income to {amt}</>;
    },
  },
  'budget.remove': {
    icon: Coins,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) {
        return <>removed {amt} income for <B>{String(m.contributorName)}</B></>;
      }
      return <>removed {amt} from the trip fund</>;
    },
  },
  'member.remove': {
    icon: UserMinus,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => (
      <>removed <B>{String(m?.removedName ?? 'a member')}</B> from the trip</>
    ),
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: '#6B7280',
  bg: '#F9FAFB',
  label: (action: string) => action.replace('.', ' '),
};

function getSummaryChips(entry: ActivityEntry): SummaryChip[] {
  const chips: SummaryChip[] = [];
  const placeName = getString(entry.meta, 'placeName');
  const contributorName = getString(entry.meta, 'contributorName');
  const role = getString(entry.meta, 'role');
  const title = getString(entry.meta, 'title');
  const categoryName = getString(entry.meta, 'name');
  const amount = getNumber(entry.meta, 'amount');
  const currency = getString(entry.meta, 'currency');

  if (placeName) {
    chips.push({
      icon: MapPin,
      label: placeName,
      bg: '#EFF6FF',
      color: '#2563EB',
    });
  } else if (title && entry.action.startsWith('expense.')) {
    chips.push({
      icon: Receipt,
      label: title,
      bg: '#F5F3FF',
      color: '#7C3AED',
    });
  } else if (categoryName) {
    chips.push({
      icon: Tag,
      label: categoryName,
      bg: '#FDF2F8',
      color: '#DB2777',
    });
  }

  if (contributorName) {
    chips.push({
      icon: UserRound,
      label: contributorName,
      bg: '#ECFEFF',
      color: '#0F766E',
    });
  } else if (role) {
    chips.push({
      icon: UserPlus,
      label: role,
      bg: '#FEF3C7',
      color: '#B45309',
    });
  }

  if (amount != null && currency) {
    chips.push({
      icon: Coins,
      label: formatCurrency(amount, currency),
      bg: '#F0FDFA',
      color: '#0F766E',
    });
  }

  return chips.slice(0, 3);
}

function getDetailFacts(entry: ActivityEntry): DetailFact[] {
  const facts: DetailFact[] = [
    {
      label: 'When',
      value: formatDateTime(entry.created_at),
    },
    {
      label: 'Action',
      value: formatActionKey(entry.action),
    },
  ];

  const actorName = entry.profile?.display_name ?? 'A member';
  facts.push({
    label: 'By',
    value: actorName,
  });

  const placeName = getString(entry.meta, 'placeName');
  const address = getString(entry.meta, 'address');
  const title = getString(entry.meta, 'title');
  const categoryName = getString(entry.meta, 'name');
  const contributorName = getString(entry.meta, 'contributorName');
  const removedName = getString(entry.meta, 'removedName');
  const role = getString(entry.meta, 'role');
  const amount = getNumber(entry.meta, 'amount');
  const currency = getString(entry.meta, 'currency');
  const planningRange = formatPlanningRange(entry.meta);
  const checkinAt = getString(entry.meta, 'checkinAt');
  const checkoutAt = getString(entry.meta, 'checkoutAt');

  if (placeName) {
    facts.push({ label: 'Place', value: placeName, tone: 'primary' });
  }
  if (title && !entry.action.startsWith('trip.')) {
    facts.push({ label: 'Purpose', value: title });
  }
  if (categoryName) {
    facts.push({ label: 'Category', value: categoryName });
  }
  if (contributorName) {
    facts.push({ label: 'Contributor', value: contributorName });
  }
  if (removedName) {
    facts.push({ label: 'Member', value: removedName });
  }
  if (role) {
    facts.push({ label: 'Role', value: role });
  }
  if (amount != null && currency) {
    facts.push({ label: 'Amount', value: formatCurrency(amount, currency), tone: 'primary' });
  }
  if (planningRange) {
    facts.push({ label: 'Planning range', value: planningRange });
  }
  if (checkinAt) {
    facts.push({ label: 'Check in', value: formatDateTime(checkinAt) });
  }
  if (checkoutAt) {
    facts.push({ label: 'Check out', value: formatDateTime(checkoutAt) });
  }
  if (address) {
    facts.push({ label: 'Location', value: address });
  }

  return facts;
}

function getDetailNote(entry: ActivityEntry): string | null {
  return getString(entry.meta, 'body') ?? getString(entry.meta, 'note');
}

// -------------------------------------------------------
// Day grouping
// -------------------------------------------------------

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmt = (dt: Date) => dt.toDateString();
  if (fmt(d) === fmt(today)) return 'Today';
  if (fmt(d) === fmt(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}

// -------------------------------------------------------
// Single activity card (expandable)
// -------------------------------------------------------

function ActivityCard({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = ACTION_CONFIG[entry.action] ?? null;
  const Icon = cfg?.icon ?? DEFAULT_CONFIG.icon;
  const color = cfg?.color ?? DEFAULT_CONFIG.color;
  const bg = cfg?.bg ?? DEFAULT_CONFIG.bg;
  const labelNode: ReactNode = cfg
    ? cfg.label(entry.meta)
    : DEFAULT_CONFIG.label(entry.action);
  const displayName = entry.profile?.display_name ?? 'A member';
  const detailNode: ReactNode | null = cfg?.detail ? cfg.detail(entry.meta) : null;
  const summaryChips = getSummaryChips(entry);
  const facts = getDetailFacts(entry);
  const note = getDetailNote(entry);

  return (
    <div
      className="overflow-hidden rounded-[1.35rem] border bg-white shadow-[0_18px_50px_rgba(28,25,23,0.06)] transition-shadow hover:shadow-[0_24px_60px_rgba(28,25,23,0.08)]"
      style={{ borderColor: 'rgba(193, 176, 152, 0.28)' }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full px-3 py-3 text-left transition-colors hover:bg-black/[0.015] sm:px-4"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bg }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-stone-700">
                  <span className="font-semibold text-stone-950">{displayName}</span>
                  {' '}
                  {labelNode}
                </p>
                <div
                  className="mt-1 flex flex-wrap items-center gap-2 text-[11px]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatDateTime(entry.created_at, { includeYear: false })}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-subtle)' }}
                  >
                    {formatActionKey(entry.action)}
                  </span>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <Avatar
                  user={{ display_name: entry.profile?.display_name ?? null, avatar_url: entry.profile?.avatar_url ?? null }}
                  size="sm"
                />
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-subtle)' }}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
                  />
                </span>
              </div>
            </div>

            {summaryChips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {summaryChips.map((chip) => {
                  const ChipIcon = chip.icon;
                  return (
                    <span
                      key={`${entry.id}-${chip.label}`}
                      className="inline-flex min-w-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ backgroundColor: chip.bg, color: chip.color }}
                    >
                      <ChipIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{chip.label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4" style={{ borderColor: 'var(--color-border-muted)' }}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map((fact) => (
              <div
                key={`${entry.id}-${fact.label}`}
                className="rounded-2xl border px-3 py-2.5"
                style={{ borderColor: 'var(--color-border-muted)', backgroundColor: 'rgba(255,255,255,0.82)' }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  {fact.label}
                </p>
                <p
                  className={cn('mt-1 text-sm font-medium leading-snug break-words', fact.tone === 'primary' && 'font-semibold')}
                  style={{ color: fact.tone === 'primary' ? 'var(--color-primary)' : 'var(--color-text)' }}
                >
                  {fact.value}
                </p>
              </div>
            ))}
          </div>

          {(note || detailNode) && (
            <div className="mt-3 space-y-2">
              {note && (
                <div
                  className="rounded-2xl border px-3 py-3"
                  style={{ borderColor: 'var(--color-border-muted)', backgroundColor: 'var(--color-bg-subtle)' }}
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: 'var(--color-text-subtle)' }}
                  >
                    Details
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {note}
                  </p>
                </div>
              )}

              {detailNode && (
                <div
                  className="rounded-2xl border px-3 py-3 text-sm leading-relaxed"
                  style={{ borderColor: 'var(--color-border-muted)', backgroundColor: 'rgba(255,255,255,0.82)', color: 'var(--color-text-muted)' }}
                >
                  {detailNode}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// ActivityFeed
// -------------------------------------------------------

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="section-shell flex flex-col items-center p-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Activity className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <p className="font-medium text-sm text-stone-700 mb-1">No activity yet</p>
        <p className="text-xs text-stone-400">Member actions like adding places, comments, and votes will appear here.</p>
      </div>
    );
  }

  // Group by day
  const groups: { label: string; entries: ActivityEntry[] }[] = [];
  let lastDay = '';
  for (const entry of activities) {
    const label = dayLabel(entry.created_at);
    if (label !== lastDay) {
      groups.push({ label, entries: [] });
      lastDay = label;
    }
    groups[groups.length - 1].entries.push(entry);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            {group.label}
          </p>
          <div className="space-y-3">
            {group.entries.map((entry) => (
              <ActivityCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
