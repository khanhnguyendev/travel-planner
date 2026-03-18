'use client';

import { useState } from 'react';
import { Shield, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { removeMember, changeMemberRole } from '@/features/members/actions';
import type { MemberWithProfile } from '@/features/members/queries';
import type { TripRole } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';

// -------------------------------------------------------
// Role badge
// -------------------------------------------------------

function RoleBadge({ role }: { role: TripRole }) {
  const styles: Record<TripRole, string> = {
    owner: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    admin: 'bg-blue-50 text-blue-600 border-blue-100',
    editor: 'bg-slate-100 text-slate-600 border-slate-200',
    viewer: 'bg-orange-50 text-orange-600 border-orange-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all shadow-sm',
        styles[role]
      )}
    >
      <Shield className="w-3.5 h-3.5" />
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
}: MemberListProps) {
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
      } else {
        resolve(result.error ?? 'Failed to remove member', 'error');
      }
    } finally {
      setLoadingUserId(null);
    }
  }

  if (members.length === 0) {
    return (
      <div className="py-12 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
          No members found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {members.map((m) => {
        const name = m.profile.display_name ?? 'Unknown';
        const isOwner = m.role === 'owner';
        const isCurrentUser = m.user_id === currentUserId;
        const isLoading = loadingUserId === m.user_id;

        const canChangeRole = canManage && !isOwner && !isCurrentUser;
        const canRemove = canManage && !isOwner && !isCurrentUser;

        return (
          <div
            key={m.id}
            className={cn(
              'flex items-center gap-4 p-4 card-premium bg-white group transition-all duration-300',
              isLoading && 'opacity-60 pointer-events-none'
            )}
          >
            <div className="relative">
              <Avatar user={{ display_name: name, avatar_url: m.profile.avatar_url }} size="md" className="ring-2 ring-white shadow-soft" />
              {isOwner && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                   <Shield className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                  {name}
                  {isCurrentUser && (
                    <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full">
                      you
                    </span>
                  )}
                </span>
              </div>
              {m.joined_at && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Joined {new Date(m.joined_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Role: dropdown if editable, badge otherwise */}
            <div className="flex items-center gap-3">
              {canChangeRole ? (
                <div className="relative">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_id, e.target.value as TripRole)}
                    disabled={isLoading}
                    className="appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wider outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner text-slate-700 pr-8"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                     <Shield className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                <RoleBadge role={m.role} />
              )}

              {/* Remove button */}
              {canRemove && (
                <button
                  type="button"
                  onClick={() => handleRemove(m.user_id, name)}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl transition-all duration-300 hover:bg-rose-50 hover:text-rose-600 text-slate-400 bg-slate-50 border border-slate-100 shadow-sm active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
