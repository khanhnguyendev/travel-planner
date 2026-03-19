'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Copy, Check, Loader2, UserPlus } from 'lucide-react';
import { generateInviteLink } from '@/features/members/actions';
import type { TripRole } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';

interface InviteLinkButtonProps {
  tripId: string;
  label?: string;
  className?: string;
}

const ROLES: { value: TripRole; label: string; description: string }[] = [
  { value: 'editor', label: 'Editor', description: 'Can add places, vote, and add expenses' },
  { value: 'viewer', label: 'Viewer', description: 'Can view and vote only' },
  { value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
];

export function InviteLinkButton({
  tripId,
  label = 'Invite link',
  className,
}: InviteLinkButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const [role, setRole] = useState<TripRole>('editor');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingToast = useLoadingToast();

  function handleOpen() {
    setInviteUrl(null);
    setCopied(false);
    setRole('editor');
    setOpen(true);
  }

  async function handleGenerate() {
    setLoading(true);
    const resolve = loadingToast('Generating link…');
    const result = await generateInviteLink(tripId, role);
    setLoading(false);
    if (result.ok) {
      resolve('Link ready!', 'success');
      setInviteUrl(result.data.inviteUrl);
      emitTripSectionRefresh(tripId, TRIP_REFRESH_SECTIONS.invites);
      startRefreshTransition(() => {
        router.refresh();
      });
    } else {
      resolve(result.error, 'error');
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors min-h-[36px]', className)}
        style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
      >
        <UserPlus className="w-3.5 h-3.5" />
        {label}
      </button>

      {open && (
        <Dialog title="Share invite link" onClose={() => setOpen(false)} maxWidth="sm:max-w-sm">
          <div className="min-w-0 space-y-5 overflow-x-hidden">
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}>
              Invite links are the only sharing method right now. Generate a link, then send it manually in chat or any messaging app.
            </div>

            {/* Role selector */}
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Role
              </p>
              <div className="space-y-2">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                    style={{
                      borderColor: role === r.value ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: role === r.value ? 'var(--color-primary-light)' : 'var(--color-bg)',
                    }}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => { setRole(r.value); setInviteUrl(null); }}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{r.label}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{r.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Generate shareable link
            </button>

            {/* Link display */}
            {inviteUrl && (
              <div className="space-y-2">
                <div
                  className="flex min-w-0 flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}
                >
                  <p className="min-w-0 flex-1 break-all text-xs text-stone-600 font-mono">{inviteUrl}</p>
                  <button
                    onClick={handleCopy}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:w-auto sm:flex-shrink-0"
                    style={{
                      backgroundColor: copied ? '#D1FAE5' : 'white',
                      color: copied ? '#065F46' : 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-stone-400">
                  Link expires in 7 days. Anyone with it can join as <span className="font-medium capitalize">{role}</span>. Copy it and share it manually.
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
