import { MapPin, MessageCircle, ThumbsUp, ThumbsDown, Receipt, Tag, UserPlus, Activity } from 'lucide-react';
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
  'expense.add': {
    icon: Receipt,
    color: '#8B5CF6',
    bg: '#F5F3FF',
    label: (m) => `added expense ${m?.title ? `"${m.title}"` : ''}`,
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
      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
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
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-subtle)' }}>
            {group.label}
          </p>
          <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
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
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  {/* Action icon */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 leading-snug">
                      <span className="font-semibold text-stone-800">{displayName}</span>
                      {' '}{labelText}
                    </p>
                    {entry.action === 'comment.add' && entry.meta?.body != null && (
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        &ldquo;{String(entry.meta.body)}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Avatar + time */}
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
