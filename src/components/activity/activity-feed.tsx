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
    color: 'rgb(16 185 129)', // emerald-500
    bg: 'rgb(240 253 250)', // emerald-50
    label: (m) => `added ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'place.delete': {
    icon: MapPin,
    color: 'rgb(244 63 94)', // rose-500
    bg: 'rgb(255 241 242)', // rose-50
    label: (m) => `removed ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'comment.add': {
    icon: MessageCircle,
    color: 'rgb(99 102 241)', // indigo-500
    bg: 'rgb(238 242 255)', // indigo-50
    label: (m) => `commented on ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'vote.upvote': {
    icon: ThumbsUp,
    color: 'rgb(16 185 129)', // emerald-500
    bg: 'rgb(240 253 250)', // emerald-50
    label: (m) => `upvoted ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'vote.downvote': {
    icon: ThumbsDown,
    color: 'rgb(245 158 11)', // amber-500
    bg: 'rgb(255 251 235)', // amber-50
    label: (m) => `downvoted ${m?.placeName ? `"${m.placeName}"` : 'a place'}`,
  },
  'expense.add': {
    icon: Receipt,
    color: 'rgb(139 92 246)', // violet-500
    bg: 'rgb(245 243 255)', // violet-50
    label: (m) => `added expense ${m?.title ? `"${m.title}"` : ''}`,
  },
  'category.add': {
    icon: Tag,
    color: 'rgb(236 72 153)', // pink-500
    bg: 'rgb(253 242 248)', // pink-50
    label: (m) => `created category ${m?.name ? `"${m.name}"` : ''}`,
  },
  'member.join': {
    icon: UserPlus,
    color: 'rgb(59 130 246)', // blue-500
    bg: 'rgb(239 246 255)', // blue-50
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
      <div className="card-premium py-20 flex flex-col items-center text-center border-dashed border-2 bg-slate-50/50">
        <div className="w-16 h-16 rounded-[2rem] bg-slate-100 flex items-center justify-center mb-6 shadow-soft">
          <Activity className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="font-display font-bold text-xl text-foreground mb-2">Quiet on the front...</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Member actions like adding places, comments, and shared costs will be logged here.
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
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.label} className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[20px] top-[40px] bottom-0 w-px bg-slate-100 pointer-events-none" />

          <p className="font-display font-bold text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-6 flex items-center gap-3">
             <span className="w-10 h-px bg-slate-100" />
             {group.label}
          </p>
          <div className="grid grid-cols-1 gap-4">
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
                <div key={entry.id} className="flex items-start gap-4 p-4 card-premium bg-white group hover:shadow-soft transition-all duration-300 relative z-10">
                  {/* Action icon */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">{displayName}</span>
                      {' '}<span className="text-muted-foreground">{labelText}</span>
                    </p>
                    {entry.action === 'comment.add' && entry.meta?.body != null && (
                      <div className="mt-2 pl-3 border-l-2 border-slate-100 italic">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          &ldquo;{String(entry.meta.body)}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Avatar + time */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                    <Avatar
                      user={{ display_name: displayName, avatar_url: entry.profile?.avatar_url ?? null }}
                      size="sm"
                      className="ring-2 ring-white shadow-sm"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">{timeAgo(entry.created_at)}</span>
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
