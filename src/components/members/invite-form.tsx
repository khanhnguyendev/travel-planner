'use client';

import { useState } from 'react';
import { UserPlus, Mail, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';
import { sendInvite } from '@/features/members/actions';
import type { TripRole } from '@/lib/types';

// -------------------------------------------------------
// Props
// -------------------------------------------------------

interface InviteFormProps {
  tripId: string;
}

// -------------------------------------------------------
// InviteForm
// -------------------------------------------------------

export function InviteForm({ tripId }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TripRole>('editor');
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
      const result = await sendInvite(tripId, trimmed, role);
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
        <div className="rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Mail className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="flex items-end gap-3 flex-wrap">
        {/* Email input */}
        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor="invite-email"
            className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1"
          >
            Email address
          </label>
          <div className="relative group">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none"
            />
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@travel.com"
              required
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-2xl border border-slate-200 pl-11 pr-4 py-3 text-sm outline-none transition-all shadow-soft',
                'focus:ring-4 focus:ring-primary/5 focus:border-primary bg-white text-foreground placeholder:text-slate-400',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            />
          </div>
        </div>

        {/* Role select */}
        <div className="w-40">
          <label
            htmlFor="invite-role"
            className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1"
          >
            Role
          </label>
          <div className="relative">
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as TripRole)}
              disabled={isSubmitting}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary shadow-soft text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-premium flex items-center gap-2 h-[48px] px-6 disabled:opacity-50 disabled:grayscale"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <UserPlus className="w-4 h-4 text-white" />}
          <span className="font-display font-bold uppercase tracking-widest text-[11px] text-white">
            {isSubmitting ? 'Sending...' : 'Invite Member'}
          </span>
        </button>
      </div>
    </form>
  );
}
