'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Trash2 } from 'lucide-react';
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

function RoleBadge({ role }: { role: TripRole }) {
  const styles: Record<TripRole, string> = {
    owner: 'bg-teal-100 text-teal-800',
    admin: 'bg-blue-100 text-blue-800',
    editor: 'bg-stone-200 text-stone-700',
    viewer: 'bg-stone-100 text-stone-500',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        styles[role]
      )}
    >
      <Shield className="w-3 h-3" />
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
      {members.map((m) => {
        const name = m.profile.display_name ?? 'Unknown';
        const isOwner = m.role === 'owner';
        const isCurrentUser = m.user_id === currentUserId;
        const isLoading = loadingUserId === m.user_id;
        const balanceNet = balanceMap?.get(m.user_id);
        const hasBalance = balanceNet !== undefined && Math.abs(balanceNet) > 0.005;

        // Can change role: canManage, not owner, not self
        const canChangeRole = canManage && !isOwner && !isCurrentUser;
        // Can remove: canManage, not owner, not self
        const canRemove = canManage && !isOwner && !isCurrentUser;

        return (
          <div
            key={m.id}
            className={cn(
              'flex items-center gap-3 py-3 px-1',
              isLoading && 'opacity-60 pointer-events-none'
            )}
          >
            <Avatar user={{ display_name: name, avatar_url: m.profile.avatar_url }} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {name}
                  {isCurrentUser && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                      (you)
                    </span>
                  )}
                </span>
              </div>
              {m.joined_at && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                  Joined {formatDateTime(m.joined_at)}
                </p>
              )}
              {hasBalance && (
                <p
                  className="text-xs mt-0.5 font-medium"
                  style={{ color: balanceNet! > 0 ? '#0F766E' : '#EF4444' }}
                >
                  {balanceNet! > 0 ? '+' : ''}{formatCurrency(balanceNet!, balanceCurrency)}
                </p>
              )}
            </div>

            {/* Role: dropdown if editable, badge otherwise */}
            {canChangeRole ? (
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.user_id, e.target.value as TripRole)}
                disabled={isLoading}
                className="rounded-lg border px-2 py-1 text-xs outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'white',
                  color: 'var(--color-text)',
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            ) : (
              <RoleBadge role={m.role} />
            )}

            {/* Remove button */}
            {canRemove && (
              <button
                type="button"
                onClick={() => handleRemove(m.user_id, name)}
                disabled={isLoading}
                title={`Remove ${name}`}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
