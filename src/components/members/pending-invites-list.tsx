'use client';

import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { revokeInvite } from '@/features/members/actions';
import type { PendingInvite } from '@/features/members/queries';
import type { TripRole } from '@/lib/types';
import { CopyButton } from '@/components/ui/copy-button';

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface PendingInvitesListProps {
  tripId: string;
  invites: PendingInvite[];
  canManage: boolean;
}

// -------------------------------------------------------
// Role badge colors
// -------------------------------------------------------

const roleBadgeClass: Record<TripRole, string> = {
  owner: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  admin: 'bg-blue-50 text-blue-600 border-blue-100',
  editor: 'bg-slate-100 text-slate-600 border-slate-200',
  viewer: 'bg-orange-50 text-orange-600 border-orange-100',
};

// -------------------------------------------------------
// PendingInvitesList
// -------------------------------------------------------

export function PendingInvitesList({ tripId, invites, canManage }: PendingInvitesListProps) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  async function handleRevoke(inviteId: string, email: string) {
    const confirmed = window.confirm(`Revoke invite for ${email}?`);
    if (!confirmed) return;

    setRevoking(inviteId);
    const resolve = loadingToast('Revoking invite…');
    try {
      const result = await revokeInvite(tripId, inviteId);
      if (result.ok) {
        resolve('Invite revoked', 'success');
      } else {
        resolve(result.error ?? 'Failed to revoke invite', 'error');
      }
    } finally {
      setRevoking(null);
    }
  }

  if (invites.length === 0) {
    return (
      <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          No pending invitations
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {invites.map((invite) => {
        const isRevoking = revoking === invite.id;
        const expiresAt = new Date(invite.expires_at);
        const role = invite.role as TripRole;

        return (
          <div
            key={invite.id}
            className={cn(
              'flex items-center gap-4 p-4 card-premium bg-white group hover:shadow-soft transition-all duration-300 relative',
              isRevoking && 'opacity-60 pointer-events-none'
            )}
          >
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 transition-colors">
              <Mail className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {invite.email}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-1">
                Expires {expiresAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all shadow-sm',
                  roleBadgeClass[role]
                )}
              >
                {role}
              </span>

              {/* Copy invite link */}
              <CopyButton
                text={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/invites/accept?token=${invite.token ?? ''}`}
                className="h-9 w-9 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
              />

              {canManage && (
                <button
                  type="button"
                  onClick={() => handleRevoke(invite.id, invite.email)}
                  disabled={isRevoking}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 hover:bg-rose-50 hover:text-rose-600 text-slate-400 bg-slate-50 border border-slate-100 shadow-sm active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
