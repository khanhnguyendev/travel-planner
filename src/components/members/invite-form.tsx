'use client';

import { useState } from 'react';
import { UserPlus, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { sendInvite } from '@/features/members/actions';
import type { ProjectRole } from '@/lib/types';

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface InviteFormProps {
  projectId: string;
}

// -------------------------------------------------------
// InviteForm
// -------------------------------------------------------

export function InviteForm({ projectId }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('editor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);
    const resolve = loadingToast('Sending invite…');
    try {
      const result = await sendInvite(projectId, trimmed, role);
      if (result.ok) {
        resolve('Invite sent!', 'success');
        setEmail('');
        setRole('editor');
      } else {
        const msg = result.error ?? 'Failed to send invite';
        resolve(msg, 'error');
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: '#FEE2E2', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        {/* Email input */}
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="invite-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Email address
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--color-text-subtle)' }}
            />
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-xl border pl-9 pr-3 py-2.5 text-sm outline-none transition-colors',
                'focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'white',
                color: 'var(--color-text)',
              }}
            />
          </div>
        </div>

        {/* Role select */}
        <div className="w-36">
          <label
            htmlFor="invite-role"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as ProjectRole)}
            disabled={isSubmitting}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
            'bg-teal-600 text-white hover:bg-teal-700',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
        >
          <UserPlus className="w-4 h-4" />
          {isSubmitting ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </form>
  );
}
