'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock } from 'lucide-react';
import { requestToJoin } from '@/features/members/actions';
import { useToast } from '@/components/ui/toast';

interface JoinRequestButtonProps {
  tripId: string;
  isAuthenticated: boolean;
  alreadyRequested: boolean;
}

export function JoinRequestButton({ tripId, isAuthenticated, alreadyRequested }: JoinRequestButtonProps) {
  const [requested, setRequested] = useState(alreadyRequested);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleClick() {
    if (!isAuthenticated) {
      router.push(`/sign-in?next=/trips/${tripId}`);
      return;
    }

    if (requested) return;

    setLoading(true);
    const result = await requestToJoin(tripId);
    setLoading(false);

    if (result.ok) {
      setRequested(true);
      showToast('Join request sent! The trip owner will review it.', 'success');
    } else {
      showToast(result.error, 'error');
    }
  }

  if (requested) {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
        <Clock className="h-4 w-4" />
        Join request pending
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      <UserPlus className="h-4 w-4" />
      {loading ? 'Sending…' : isAuthenticated ? 'Request to join' : 'Sign in to join'}
    </button>
  );
}
