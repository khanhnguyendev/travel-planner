import type { ReactNode } from 'react';
import { MapPin, MessageCircle, ThumbsUp, ThumbsDown, Receipt, Tag, UserPlus, Activity, Compass, CalendarDays, LogIn, LogOut, Coins, UserMinus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { ActivityEntry } from '@/features/activity/queries';

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
// Component
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
            {group.entries.map((entry) => {
              const cfg = ACTION_CONFIG[entry.action] ?? null;
              const Icon = cfg?.icon ?? DEFAULT_CONFIG.icon;
              const color = cfg?.color ?? DEFAULT_CONFIG.color;
              const bg = cfg?.bg ?? DEFAULT_CONFIG.bg;
              const labelNode: ReactNode = cfg
                ? cfg.label(entry.meta)
                : DEFAULT_CONFIG.label(entry.action);
              const displayName = entry.profile?.display_name ?? 'A member';

              return (
                <div key={entry.id} className="flex items-start gap-3 border-b px-4 py-4 last:border-b-0" style={{ borderColor: 'rgba(193, 176, 152, 0.28)' }}>
                  <div
                    className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-stone-600">
                      <span className="font-semibold text-stone-900">{displayName}</span>
                      {' '}{labelNode}
                    </p>
                    {entry.action === 'comment.add' && entry.meta?.body != null && (
                      <p className="mt-1 text-xs italic text-stone-400 truncate">
                        &ldquo;{String(entry.meta.body)}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-stone-400 whitespace-nowrap">{formatDateTime(entry.created_at, { includeYear: false })}</span>
                    <Avatar
                      user={{ display_name: entry.profile?.display_name ?? null, avatar_url: entry.profile?.avatar_url ?? null }}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
