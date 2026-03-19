'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { MapPin, MessageCircle, ThumbsUp, ThumbsDown, Receipt, Tag, UserPlus, Activity, Compass, CalendarDays, LogIn, LogOut, Coins, UserMinus } from 'lucide-react';
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
  const detailNode: ReactNode | null = cfg?.detail ? cfg.detail(entry.meta) : null;
  const displayName = entry.profile?.display_name ?? 'A member';

  const hasDetail = detailNode != null;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'rgba(193, 176, 152, 0.28)' }}>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => { if (hasDetail) setExpanded((v) => !v); }}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          hasDetail ? 'hover:bg-black/[0.02] cursor-pointer' : 'cursor-default'
        )}
      >
        {/* Action icon */}
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: bg }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm leading-snug text-stone-600">
            <span className="font-semibold text-stone-900">{displayName}</span>
            {' '}{labelNode}
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
            {formatDateTime(entry.created_at, { includeYear: false })}
          </p>
        </div>

        {/* Avatar + chevron */}
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <Avatar
            user={{ display_name: entry.profile?.display_name ?? null, avatar_url: entry.profile?.avatar_url ?? null }}
            size="sm"
          />
          {hasDetail && (
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
              style={{ color: 'var(--color-text-subtle)' }}
            />
          )}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && hasDetail && (
        <div
          className="px-4 pb-3 pt-0 text-xs leading-relaxed text-stone-500"
          style={{ paddingLeft: '3.5rem' /* align with label */ }}
        >
          {detailNode}
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
          <div className="section-shell overflow-hidden">
            {group.entries.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
