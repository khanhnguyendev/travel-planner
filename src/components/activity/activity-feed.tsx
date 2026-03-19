import { MapPin, MessageCircle, ThumbsUp, ThumbsDown, Receipt, Tag, UserPlus, Activity, Compass, CalendarDays, LogIn, LogOut, Coins, UserMinus } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import type { ActivityEntry } from '@/features/activity/queries';

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

// -------------------------------------------------------
// Per-action config
// -------------------------------------------------------

const ACTION_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  label: (meta: Record<string, unknown> | null) => string;
}> = {
  'trip.create': {
    icon: Compass,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `created trip${m?.title ? ` "${m.title}"` : ''}`,
  },
  'place.add': {
    icon: MapPin,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `added ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'place.delete': {
    icon: MapPin,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => `removed ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'comment.add': {
    icon: MessageCircle,
    color: '#6366F1',
    bg: '#EEF2FF',
    label: (m) => `commented on ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'vote.upvote': {
    icon: ThumbsUp,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `upvoted ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'vote.downvote': {
    icon: ThumbsDown,
    color: '#F97316',
    bg: '#FFF7ED',
    label: (m) => `downvoted ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'trip.date_update': {
    icon: CalendarDays,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `updated trip dates${m?.startDate ? ` to ${m.startDate}${m.endDate ? ` – ${m.endDate}` : ''}` : ''}`,
  },
  'expense.add': {
    icon: Receipt,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    label: (m) => `added expense ${m?.title ? `"${m.title}"` : ''}`,
  },
  'expense.delete': {
    icon: Receipt,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: (m) => `removed expense ${m?.title ? `"${m.title}"` : ''}`,
  },
  'category.add': {
    icon: Tag,
    color: '#EC4899',
    bg: '#FDF2F8',
    label: (m) => `created category ${m?.name ? `"${m.name}"` : ''}`,
  },
  'member.join': {
    icon: UserPlus,
    color: '#3B82F6',
    bg: '#EFF6FF',
    label: () => 'joined the trip',
  },
  'place.checkin': {
    icon: LogIn,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `checked in at ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'place.checkout': {
    icon: LogOut,
    color: '#6B7280',
    bg: '#F9FAFB',
    label: (m) => `checked out of ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'budget.contribute': {
    icon: Coins,
    color: '#0D9488',
    bg: '#F0FDFA',
    label: (m) => `added ${m?.amount && m?.currency ? `${m.amount} ${m.currency}` : 'funds'} to the trip budget`,
  },
  'member.remove': {
    icon: UserMinus,
    color: '#EF4444',
    bg: '#FEF2F2',
    label: () => 'was removed from the trip',
  },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: '#6B7280',
  bg: '#F9FAFB',
  label: (action: string) => action.replace('.', ' '),
};

// -------------------------------------------------------
// Time ago helper
// -------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });
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
              const labelText = cfg
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
                    <p className="text-sm leading-snug text-stone-700">
                      <span className="font-semibold text-stone-800">{displayName}</span>
                      {' '}{labelText}
                    </p>
                    {entry.action === 'comment.add' && entry.meta?.body != null && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        &ldquo;{String(entry.meta.body)}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-stone-400 whitespace-nowrap">{timeAgo(entry.created_at)}</span>
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
