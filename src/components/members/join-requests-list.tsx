'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { approveJoinRequest, denyJoinRequest } from '@/features/members/actions';
import { useLoadingToast } from '@/components/ui/toast';
import type { MemberWithProfile } from '@/features/members/queries';

interface JoinRequestsListProps {
  tripId: string;
  initialRequests: MemberWithProfile[];
}

export function JoinRequestsList({ tripId, initialRequests }: JoinRequestsListProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const loadingToast = useLoadingToast();

  if (requests.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        No pending join requests.
      </p>
    );
  }

  async function handleApprove(userId: string) {
    setProcessing((prev) => new Set(prev).add(userId));
    const resolve = loadingToast('Approving request…');
    const result = await approveJoinRequest(tripId, userId);
    setProcessing((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    if (result.ok) {
      resolve('Request approved', 'success');
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } else {
      resolve(result.error, 'error');
    }
  }

  async function handleDeny(userId: string) {
    setProcessing((prev) => new Set(prev).add(userId));
    const resolve = loadingToast('Declining request…');
    const result = await denyJoinRequest(tripId, userId);
    setProcessing((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    if (result.ok) {
      resolve('Request declined', 'success');
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } else {
      resolve(result.error, 'error');
    }
  }

  return (
    <ul className="space-y-3">
      {requests.map((req) => {
        const isPending = processing.has(req.user_id);
        return (
          <li key={req.user_id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={req.profile.avatar_url}
                displayName={req.profile.display_name ?? 'User'}
                size={36}
              />
              <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                {req.profile.display_name ?? 'Unknown user'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleApprove(req.user_id)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleDeny(req.user_id)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <X className="h-3.5 w-3.5" />
                Decline
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
