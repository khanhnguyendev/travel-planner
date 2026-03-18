'use client';

import { useState } from 'react';
import { Link2, Copy, Check, ChevronDown, Loader2 } from 'lucide-react';
import { generateInviteLink } from '@/features/members/actions';
import type { ProjectRole } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';

interface InviteLinkButtonProps {
  projectId: string;
}

const ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

export function InviteLinkButton({ projectId }: InviteLinkButtonProps) {
  const [role, setRole] = useState<ProjectRole>('editor');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadingToast = useLoadingToast();

  async function handleGenerate() {
    setLoading(true);
    const resolve = loadingToast('Generating link…');
    const result = await generateInviteLink(projectId, role);
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Role selector */}
        <div className="relative">
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value as ProjectRole); setInviteUrl(null); }}
            className="appearance-none pl-3 pr-7 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-stone-400" />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-colors min-h-[36px] disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Generate link
        </button>
      </div>

      {/* Link display + copy */}
      {inviteUrl && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border bg-stone-50" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs text-stone-600 flex-1 truncate font-mono">{inviteUrl}</p>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0"
            style={{
              backgroundColor: copied ? '#D1FAE5' : 'var(--color-bg-subtle)',
              color: copied ? '#065F46' : 'var(--color-text-muted)',
            }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <p className="text-xs text-stone-400">Link expires in 7 days. Anyone with the link can join as {role}.</p>
    </div>
  );
}
