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
} from 'lucide-react';
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
  return <strong className="font-semibold" style={{ color: 'var(--color-text)' }}>{children}</strong>;
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


function formatPlanningRange(meta: Record<string, unknown> | null): string | null {
  const startDate = getString(meta, 'startDate');
  const endDate = getString(meta, 'endDate');
  if (!startDate && !endDate) return null;
  if (!startDate) return fmtDate(endDate);
  if (!endDate) return fmtDate(startDate);
  return `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
}

type DetailFact = {
  label: string;
  value: string;
  tone?: 'primary';
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
    bg: '#CCFBF1',
    label: () => 'created this trip',
  },
  'place.add': {
    icon: MapPin,
    color: '#0D9488',
    bg: '#CCFBF1',
    label: (m) => <>added <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
    detail: (m) => m?.address ? <span>{String(m.address)}</span> : null,
  },
  'place.delete': {
    icon: MapPin,
    color: '#EF4444',
    bg: '#FEE2E2',
    label: (m) => <>removed <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
  },
  'comment.add': {
    icon: MessageCircle,
    color: '#6366F1',
    bg: '#E0E7FF',
    label: (m) => <>commented on <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
    detail: (m) => m?.body != null ? (
      <span className="italic" style={{ color: 'var(--color-text-subtle)' }}>&ldquo;{String(m.body)}&rdquo;</span>
    ) : null,
  },
  'vote.upvote': {
    icon: ThumbsUp,
    color: '#0D9488',
    bg: '#CCFBF1',
    label: (m) => <>upvoted <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
  },
  'vote.downvote': {
    icon: ThumbsDown,
    color: '#F97316',
    bg: '#FFEDD5',
    label: (m) => <>downvoted <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
  },
  'trip.date_update': {
    icon: CalendarDays,
    color: '#0D9488',
    bg: '#CCFBF1',
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
    bg: '#EDE9FE',
    label: (m) => (
      <>
        added <B>&ldquo;{String(m?.title ?? 'Untitled')}&rdquo;</B>
        {m?.amount != null && <> · <Amt>{fmtAmount(m.amount, m.currency)}</Amt></>}
      </>
    ),
  },
  'expense.delete': {
    icon: Receipt,
    color: '#EF4444',
    bg: '#FEE2E2',
    label: (m) => (
      <>
        removed <B>&ldquo;{String(m?.title ?? 'Untitled')}&rdquo;</B>
        {m?.amount != null && <> · <Amt>{fmtAmount(m.amount, m.currency)}</Amt></>}
      </>
    ),
  },
  'category.add': {
    icon: Tag,
    color: '#EC4899',
    bg: '#FCE7F3',
    label: (m) => <>created category <B>&ldquo;{String(m?.name ?? '')}&rdquo;</B></>,
  },
  'member.join': {
    icon: UserPlus,
    color: '#3B82F6',
    bg: '#DBEAFE',
    label: (m) => <>joined the trip{m?.role ? <> as <B>{String(m.role)}</B></> : ''}</>,
  },
  'place.checkin': {
    icon: LogIn,
    color: '#0D9488',
    bg: '#CCFBF1',
    label: (m) => <>checked in at <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
  },
  'place.checkout': {
    icon: LogOut,
    color: '#6B7280',
    bg: '#F3F4F6',
    label: (m) => <>checked out of <B>&ldquo;{String(m?.placeName ?? 'a place')}&rdquo;</B></>,
  },
  'budget.contribute': {
    icon: Coins,
    color: '#0D9488',
    bg: '#CCFBF1',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) return <>recorded {amt} for <B>{String(m.contributorName)}</B></>;
      return <>added {amt} to the trip fund</>;
    },
  },
  'budget.edit': {
    icon: Coins,
    color: '#6366F1',
    bg: '#E0E7FF',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) return <>updated income to {amt} for <B>{String(m.contributorName)}</B></>;
      return <>updated income to {amt}</>;
    },
  },
  'budget.remove': {
    icon: Coins,
    color: '#EF4444',
    bg: '#FEE2E2',
    label: (m) => {
      const amt = <Amt>{fmtAmount(m?.amount, m?.currency)}</Amt>;
      if (m?.contributorName) return <>removed {amt} for <B>{String(m.contributorName)}</B></>;
      return <>removed {amt} from the trip fund</>;
    },
  },
  'member.remove': {
    icon: UserMinus,
    color: '#EF4444',
    bg: '#FEE2E2',
    label: (m) => <>removed <B>{String(m?.removedName ?? 'a member')}</B> from the trip</>,
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: '#6B7280',
  bg: '#F3F4F6',
  label: (action: string) => action.replace('.', ' '),
};

// -------------------------------------------------------
// Expanded detail facts
// -------------------------------------------------------

function getDetailFacts(entry: ActivityEntry): DetailFact[] {
  const facts: DetailFact[] = [];

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
  const body = getString(entry.meta, 'body') ?? getString(entry.meta, 'note');

  if (placeName) facts.push({ label: 'Place', value: placeName, tone: 'primary' });
  if (title && !entry.action.startsWith('trip.')) facts.push({ label: 'Purpose', value: title });
  if (categoryName) facts.push({ label: 'Category', value: categoryName });
  if (contributorName) facts.push({ label: 'Contributor', value: contributorName });
  if (removedName) facts.push({ label: 'Member', value: removedName });
  if (role) facts.push({ label: 'Role', value: role });
  if (amount != null && currency) facts.push({ label: 'Amount', value: formatCurrency(amount, currency), tone: 'primary' });
  if (planningRange) facts.push({ label: 'Dates', value: planningRange });
  if (checkinAt) facts.push({ label: 'Check-in', value: formatDateTime(checkinAt) });
  if (checkoutAt) facts.push({ label: 'Check-out', value: formatDateTime(checkoutAt) });
  if (address) facts.push({ label: 'Location', value: address });
  if (body) facts.push({ label: 'Note', value: `"${body}"` });

  return facts;
}

// -------------------------------------------------------
// Stat row (label / value)
// -------------------------------------------------------

function FactRow({ label, value, tone }: DetailFact) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex-shrink-0 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{label}</span>
      <span
        className="text-right text-[10px] font-medium"
        style={{ color: tone === 'primary' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
      >
        {value}
      </span>
    </div>
  );
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
// Single activity row (expandable)
// -------------------------------------------------------

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = ACTION_CONFIG[entry.action] ?? null;
  const Icon = cfg?.icon ?? DEFAULT_CONFIG.icon;
  const color = cfg?.color ?? DEFAULT_CONFIG.color;
  const bg = cfg?.bg ?? DEFAULT_CONFIG.bg;
  const labelNode: ReactNode = cfg
    ? cfg.label(entry.meta)
    : DEFAULT_CONFIG.label(entry.action);
  const displayName = entry.profile?.display_name ?? 'A member';
  const facts = getDetailFacts(entry);
  const hasDetail = facts.length > 0;

  return (
    <div
      className="overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--color-bg-muted)' }}
    >
      <button
        type="button"
        onClick={hasDetail ? () => setExpanded((v) => !v) : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 px-2.5 py-2 text-left',
          hasDetail && 'cursor-pointer hover:bg-black/[0.02]',
          !hasDetail && 'cursor-default',
        )}
      >
        {/* Icon */}
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{displayName}</span>
            {' '}
            {labelNode}
          </p>
          <p className="mt-0.5 text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>
            <Clock3 className="mr-0.5 inline h-2.5 w-2.5" />
            {formatDateTime(entry.created_at, { includeYear: false })}
          </p>
        </div>

        {/* Chevron */}
        {hasDetail && (
          <ChevronDown
            className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150', expanded && 'rotate-180')}
            style={{ color: 'var(--color-text-subtle)' }}
          />
        )}
      </button>

      {expanded && hasDetail && (
        <div
          className="border-t px-2.5 pb-2.5 pt-2 space-y-1.5"
          style={{ borderColor: 'var(--color-border-muted)' }}
        >
          {facts.map((fact) => (
            <FactRow key={fact.label} {...fact} />
          ))}
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
      <div
        className="relative overflow-hidden rounded-xl px-4 py-6 text-center"
        style={{ backgroundColor: 'var(--color-bg-subtle)' }}
      >
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Activity className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>No activity yet</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          Actions like adding places, comments, and votes will appear here.
        </p>
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
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      <div className="px-4 py-4 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              {group.label}
            </p>
            <div className="space-y-1">
              {group.entries.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
