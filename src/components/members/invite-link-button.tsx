'use client';

import { useState } from 'react';
import { Link2, Copy, Check, Loader2, UserPlus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        className="btn-premium flex items-center gap-2 h-[36px] px-4"
      >
        <UserPlus className="w-3.5 h-3.5 text-white" />
        <span className="font-display font-bold uppercase tracking-widest text-[10px] text-white">Invite via link</span>
      </button>

      {open && (
        <Dialog title="Invite via link" onClose={() => setOpen(false)} maxWidth="max-w-sm">
          <div className="space-y-5">
            {/* Role selector */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 ml-1">
                Select permissions
              </p>
              <div className="grid grid-cols-1 gap-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={cn(
                      "group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden",
                      role === r.value 
                        ? "bg-primary/5 border-primary shadow-soft" 
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="relative z-10">
                      <input
                        type="radio"
                        name="invite-role"
                        value={r.value}
                        checked={role === r.value}
                        onChange={() => { setRole(r.value); setInviteUrl(null); }}
                        className="mt-1 w-4 h-4 text-primary border-slate-300 focus:ring-offset-0 focus:ring-primary/20 accent-primary"
                      />
                    </div>
                    <div className="relative z-10 flex-1">
                      <p className={cn(
                        "font-display font-bold text-sm transition-colors",
                        role === r.value ? "text-primary" : "text-foreground group-hover:text-primary"
                      )}>{r.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{r.description}</p>
                    </div>
                    {role === r.value && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-premium w-full flex items-center justify-center gap-2 h-[52px] group disabled:grayscale disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Link2 className="w-5 h-5 text-white transition-transform group-hover:rotate-45" />}
              <span className="font-display font-bold uppercase tracking-widest text-[13px] text-white">
                {loading ? 'Securing link...' : 'Generate New Link'}
              </span>
            </button>

            {/* Link display */}
            {inviteUrl && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner group/link">
                  <p className="text-[11px] text-slate-500 flex-1 truncate font-mono tracking-tighter group-hover/link:text-primary transition-colors">{inviteUrl}</p>
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all",
                      copied 
                        ? "bg-emerald-500 text-white shadow-premium" 
                        : "bg-white text-slate-600 border border-slate-200 hover:border-primary hover:text-primary shadow-soft"
                    )}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                  <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">
                    Link expires in 7 days • Access: <span className="text-amber-600">{role}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
