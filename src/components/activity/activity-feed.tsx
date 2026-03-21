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
  FileText,
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
import { formatCurrency, formatDateTime, formatDate, formatFullDateTime } from '@/lib/format';
import type { ActivityEntry } from '@/features/activity/queries';
import { cn } from '@/lib/utils';
import { getTripNow, getTripTodayKey, formatInTripTimezone } from '@/lib/date';

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
  return formatInTripTimezone(new Date(dateStr), { month: 'short', day: 'numeric' });
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
      value: formatFullDateTime(entry.created_at),
    },
    {
      label: 'Action',
      value: formatActionKey(entry.action),
    },
  ];

  const actorName = entry.profile?.display_name ?? 'A member';
  const actorEmail = entry.profile?.email;
  facts.push({
    label: 'By',
    value: actorEmail ? `${actorName} (${actorEmail})` : actorName,
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
    facts.push({ label: 'Check in', value: formatFullDateTime(checkinAt) });
  }
  if (checkoutAt) {
    facts.push({ label: 'Check out', value: formatFullDateTime(checkoutAt) });
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
  const d = formatInTripTimezone(new Date(dateStr), { year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = getTripTodayKey();
  
  const dDate = new Date(dateStr);
  const yesterday = getTripNow();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (d === today) return 'Today';
  if (d === yesterdayKey) return 'Yesterday';
  
  return formatInTripTimezone(new Date(dateStr), { weekday: 'long', month: 'short', day: 'numeric' });
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

  const displayName = entry.profile?.display_name ?? 'A member';
  const email = entry.profile?.email;
  const facts = getDetailFacts(entry);
  const note = getDetailNote(entry);

  // Object-First logic: What is the main thing this activity is about?
  const objectTitle =
    getString(entry.meta, 'title') ||
    getString(entry.meta, 'placeName') ||
    getString(entry.meta, 'name') ||
    formatActionKey(entry.action);

  const amount = getNumber(entry.meta, 'amount');
  const currency = getString(entry.meta, 'currency') || 'VND';

  return (
    <div
      className={cn(
        'group relative min-w-0 overflow-hidden border bg-white transition-all',
        'rounded-[1.1rem] shadow-[0_10px_24px_rgba(87,67,40,0.05)]',
        'border-stone-200/80 hover:border-stone-300 hover:shadow-sm'
      )}
    >
      {/* Collapsed view structure matching CollapsedRow */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Icon */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg leading-none"
          style={{ backgroundColor: bg }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>

        {/* Middle: Title + Meta in 3 rows */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {objectTitle}
          </p>
          <div className="flex flex-col text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
            <span className="truncate font-medium text-stone-700">{displayName}</span>
            <span className="shrink-0">{formatDate(entry.created_at)}</span>
          </div>
        </div>

        {/* Right side alignment matching ExpenseSummaryCard */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {amount != null && (
            <span className="text-sm font-bold mr-1 shrink-0" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(amount, currency)}
            </span>
          )}
          <div className="shrink-0">
            <Avatar
              user={{ display_name: entry.profile?.display_name ?? null, avatar_url: entry.profile?.avatar_url ?? null }}
              size="xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg p-1 transition-colors hover:bg-black/[0.05]"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-200', expanded && 'rotate-180')}
              style={{ color: 'var(--color-text-subtle)' }}
            />
          </button>
        </div>
      </div>

      {/* Expanded panel with clearer Label: Data distinction */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2.5" style={{ borderColor: 'var(--color-border-muted)' }}>
          {/* Note section matching ExpenseSummaryCard Note box */}
          {note && (
            <div className="mb-3 flex items-start gap-1.5 rounded-lg px-2.5 py-2.5" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
              <FileText className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                {note}
              </p>
            </div>
          )}

          {/* Details list */}
          <div className="space-y-2">
            {/* Action Type */}
            <div className="flex items-baseline gap-3 text-[11px]">
              <span className="w-14 shrink-0 font-bold uppercase tracking-wider text-stone-400">Action</span>
              <span className="text-stone-600 font-medium">{formatActionKey(entry.action)}</span>
            </div>
            {/* By (Email) */}
            {email && (
              <div className="flex items-baseline gap-3 text-[11px]">
                <span className="w-14 shrink-0 font-bold uppercase tracking-wider text-stone-400">By</span>
                <span className="text-stone-600 font-medium break-all">{email}</span>
              </div>
            )}

            {/* Facts - Filtered for uniqueness */}
            {facts.filter(f =>
              f.label !== 'By' &&
              f.label !== 'Time' &&
              f.label !== 'When' &&
              f.label !== 'Action' &&
              f.label !== 'Amount' &&
              f.label !== 'Purpose' &&
              f.label !== 'Place'
            ).map((fact) => (
              <div key={`${entry.id}-${fact.label}`} className="flex items-baseline gap-3 text-[11px]">
                <span className="w-14 shrink-0 font-bold uppercase tracking-wider text-stone-400">{fact.label}</span>
                <span className="text-stone-600 font-medium">{fact.value}</span>
              </div>
            ))}

            {/* Timestamp */}
            <div className="flex items-baseline gap-3 text-[11px]">
              <span className="w-14 shrink-0 font-bold uppercase tracking-wider text-stone-400">Time</span>
              <span className="text-stone-500">{formatFullDateTime(entry.created_at)}</span>
            </div>
          </div>
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
