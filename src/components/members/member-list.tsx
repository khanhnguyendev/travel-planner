'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Trash2, ChevronDown, CalendarDays, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { removeMember, changeMemberRole } from '@/features/members/actions';
import type { MemberWithProfile } from '@/features/members/queries';
import type { TripRole } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';

// -------------------------------------------------------
// Role badge
// -------------------------------------------------------

const ROLE_STYLES: Record<TripRole, string> = {
  owner: 'bg-teal-100 text-teal-800',
  admin: 'bg-blue-100 text-blue-800',
  editor: 'bg-stone-200 text-stone-700',
  viewer: 'bg-stone-100 text-stone-500',
};

const ROLE_DESC: Record<TripRole, string> = {
  owner: 'Full control — can manage all settings and members',
  admin: 'Can manage members, edit all content',
  editor: 'Can add and edit places, expenses, comments',
  viewer: 'Read-only access to trip content',
};

function RoleBadge({ role }: { role: TripRole }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium capitalize', ROLE_STYLES[role])}>
      <Shield className="w-2.5 h-2.5" />
      {role}
    </span>
  );
}

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface MemberListProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  currentUserRole: TripRole;
  balanceMap?: Map<string, number>;
  balanceCurrency?: string;
}

const ROLE_OPTIONS: TripRole[] = ['admin', 'editor', 'viewer'];

// -------------------------------------------------------
// MemberRow (expandable)
// -------------------------------------------------------

function MemberRow({
  m,
  currentUserId,
  canManage,
  balanceNet,
  balanceCurrency,
  isLoading,
  onRoleChange,
  onRemove,
}: {
  m: MemberWithProfile;
  currentUserId: string;
  canManage: boolean;
  balanceNet: number | undefined;
  balanceCurrency: string;
  isLoading: boolean;
  onRoleChange: (userId: string, role: TripRole) => void;
  onRemove: (userId: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const name = m.profile.display_name ?? 'Unknown';
  const isOwner = m.role === 'owner';
  const isCurrentUser = m.user_id === currentUserId;
  const canChangeRole = canManage && !isOwner && !isCurrentUser;
  const canRemove = canManage && !isOwner && !isCurrentUser;
  const hasBalance = balanceNet !== undefined && Math.abs(balanceNet) > 0.005;

  const balanceColor = !hasBalance ? undefined : balanceNet! > 0 ? '#0F766E' : '#EF4444';
  const BalanceIcon = !hasBalance ? Minus : balanceNet! > 0 ? TrendingUp : TrendingDown;

  return (
    <div className={cn('border-b last:border-b-0 transition-opacity', isLoading && 'opacity-60 pointer-events-none')} style={{ borderColor: 'var(--color-border-muted)' }}>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-black/[0.02]"
      >
        <Avatar user={{ display_name: name, avatar_url: m.profile.avatar_url }} size="sm" />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="truncate text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {name}
          </span>
          {isCurrentUser && (
            <span className="ml-1 text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>(you)</span>
          )}
        </div>

        {/* Right side: balance + role + chevron */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {hasBalance && (
            <span className="flex items-center gap-1 text-xs font-semibold tabular-nums" style={{ color: balanceColor }}>
              <BalanceIcon className="h-3 w-3" />
              {balanceNet! > 0 ? '+' : ''}{formatCurrency(balanceNet!, balanceCurrency)}
            </span>
          )}
          <RoleBadge role={m.role} />
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
            style={{ color: 'var(--color-text-subtle)' }}
          />
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-0" style={{ paddingLeft: '3.25rem' /* align with name */ }}>
          <div className="rounded-xl p-3 space-y-3" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>

            {/* Joined date */}
            {m.joined_at && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Joined {formatDateTime(m.joined_at)}
                </span>
              </div>
            )}

            {/* Role info */}
            <div className="flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-subtle)' }} />
              <div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize mb-0.5', ROLE_STYLES[m.role])}>
                  {m.role}
                </span>
                <p className="text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
                  {ROLE_DESC[m.role]}
                </p>
              </div>
            </div>

            {/* Balance breakdown */}
            {hasBalance && (
              <div className="flex items-center gap-2">
                <BalanceIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: balanceColor }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Net balance:{' '}
                  <span className="font-semibold" style={{ color: balanceColor }}>
                    {balanceNet! > 0 ? '+' : ''}{formatCurrency(balanceNet!, balanceCurrency)}
                  </span>
                  <span className="ml-1" style={{ color: 'var(--color-text-subtle)' }}>
                    ({balanceNet! > 0 ? 'is owed money' : 'owes others'})
                  </span>
                </span>
              </div>
            )}
            {!hasBalance && (
              <div className="flex items-center gap-2">
                <Minus className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>All settled up</span>
              </div>
            )}

            {/* Management actions */}
            {(canChangeRole || canRemove) && (
              <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border-muted)' }}>
                {canChangeRole && (
                  <select
                    value={m.role}
                    onChange={(e) => onRoleChange(m.user_id, e.target.value as TripRole)}
                    disabled={isLoading}
                    className="flex-1 rounded-lg border px-2 py-1.5 text-xs outline-none"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(m.user_id, name)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------
// MemberList
// -------------------------------------------------------

export function MemberList({
  tripId,
  members,
  currentUserId,
  currentUserRole,
  balanceMap,
  balanceCurrency = 'VND',
}: MemberListProps) {
  const router = useRouter();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  const canManage = ['owner', 'admin'].includes(currentUserRole);

  async function handleRoleChange(userId: string, newRole: TripRole) {
    setLoadingUserId(userId);
    const resolve = loadingToast('Updating role…');
    try {
      const result = await changeMemberRole(tripId, userId, newRole);
      if (result.ok) {
        resolve('Role updated!', 'success');
        emitTripSectionRefresh(tripId, [TRIP_REFRESH_SECTIONS.crew, TRIP_REFRESH_SECTIONS.activity]);
        router.refresh();
      } else {
        resolve(result.error ?? 'Failed to update role', 'error');
      }
    } finally {
      setLoadingUserId(null);
    }
  }

  async function handleRemove(userId: string, name: string) {
    const confirmed = window.confirm(`Remove ${name} from this trip?`);
    if (!confirmed) return;
    setLoadingUserId(userId);
    const resolve = loadingToast('Removing member…');
    try {
      const result = await removeMember(tripId, userId);
      if (result.ok) {
        resolve('Member removed', 'success');
        emitTripSectionRefresh(tripId, [TRIP_REFRESH_SECTIONS.crew, TRIP_REFRESH_SECTIONS.activity]);
        router.refresh();
      } else {
        resolve(result.error ?? 'Failed to remove member', 'error');
      }
    } finally {
      setLoadingUserId(null);
    }
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-subtle)' }}>
        No members yet.
      </p>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {members.map((m) => (
        <MemberRow
          key={m.id}
          m={m}
          currentUserId={currentUserId}
          canManage={canManage}
          balanceNet={balanceMap?.get(m.user_id)}
          balanceCurrency={balanceCurrency}
          isLoading={loadingUserId === m.user_id}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}
