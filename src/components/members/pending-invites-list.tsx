'use client';

import { useState } from 'react';
import { Mail, Link2, X } from 'lucide-react';
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
  owner: 'bg-teal-100 text-teal-800',
  admin: 'bg-blue-100 text-blue-800',
  editor: 'bg-stone-200 text-stone-700',
  viewer: 'bg-stone-100 text-stone-500',
};

// -------------------------------------------------------
// PendingInvitesList
// -------------------------------------------------------

export function PendingInvitesList({ tripId, invites, canManage }: PendingInvitesListProps) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  function isLinkInvite(email: string) {
    return email.startsWith('link-invite-') && email.endsWith('@noemail.local');
  }

  async function handleRevoke(inviteId: string, label: string) {
    const confirmed = window.confirm(`Revoke ${label}?`);
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
      <p className="text-sm py-3" style={{ color: 'var(--color-text-subtle)' }}>
        No pending invites.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {invites.map((invite) => {
        const isRevoking = revoking === invite.id;
        const expiresAt = new Date(invite.expires_at);
        const role = invite.role as TripRole;
        const linkInvite = isLinkInvite(invite.email);
        const label = linkInvite ? 'this invite link' : `invite for ${invite.email}`;

        return (
          <div
            key={invite.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-xl',
              isRevoking && 'opacity-60 pointer-events-none'
            )}
            style={{ backgroundColor: 'var(--color-bg-subtle)' }}
          >
            {linkInvite ? (
              <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
            ) : (
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-subtle)' }} />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                {linkInvite ? 'Invite link' : invite.email}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                {role} access · Expires {expiresAt.toLocaleDateString()}
              </p>
            </div>

            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0',
                roleBadgeClass[role]
              )}
            >
              {role}
            </span>

            {/* Copy invite link */}
            <CopyButton
              text={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/invites/accept?token=${invite.token ?? ''}`}
              label="Copy link"
            />

            {canManage && (
              <button
                type="button"
                onClick={() => handleRevoke(invite.id, label)}
                disabled={isRevoking}
                title="Revoke invite"
                className="p-1.5 rounded-lg transition-colors hover:bg-red-50 disabled:opacity-50 flex-shrink-0"
                style={{ color: 'var(--color-text-subtle)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
