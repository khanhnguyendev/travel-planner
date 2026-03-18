'use client';

import { useState } from 'react';
import { Link2, Copy, Check, Loader2, UserPlus } from 'lucide-react';
import { generateInviteLink } from '@/features/members/actions';
import type { TripRole } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';
import { Dialog } from '@/components/ui/dialog';

interface InviteLinkButtonProps {
  tripId: string;
}

const ROLES: { value: TripRole; label: string; description: string }[] = [
  { value: 'editor', label: 'Editor', description: 'Can add places, vote, and add expenses' },
  { value: 'viewer', label: 'Viewer', description: 'Can view and vote only' },
  { value: 'admin', label: 'Admin', description: 'Can manage members and settings' },
];

export function InviteLinkButton({ tripId }: InviteLinkButtonProps) {
  const [open, setOpen] = useState(false);
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
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-colors min-h-[36px]"
        style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
      >
        <UserPlus className="w-3.5 h-3.5" />
        Invite
      </button>

      {open && (
        <Dialog title="Invite via link" onClose={() => setOpen(false)} maxWidth="max-w-sm">
          <div className="space-y-5">
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
              Generate invite link
            </button>

            {/* Link display */}
            {inviteUrl && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 p-3 rounded-xl border"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}
                >
                  <p className="text-xs text-stone-600 flex-1 truncate font-mono">{inviteUrl}</p>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
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
                  Link expires in 7 days. Anyone with it can join as <span className="font-medium capitalize">{role}</span>.
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
