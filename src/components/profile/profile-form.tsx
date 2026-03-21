'use client';

import { useState, useTransition } from 'react';
import { User, Mail, CalendarDays, Plane, Crown } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { updateProfile } from '@/features/profile/actions';
import { signOut } from '@/features/auth/actions';
import type { ProfileWithStats } from '@/features/profile/queries';

interface ProfileFormProps {
  profile: ProfileWithStats;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [isPending, startTransition] = useTransition();
  const [isSigningOut, startSignOutTransition] = useTransition();

  const isDirty = displayName.trim() !== (profile.display_name ?? '');

  function handleSave() {
    startTransition(async () => {
      const result = await updateProfile(displayName);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        showToast('Profile updated', 'success');
      }
    });
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Avatar + name hero */}
      <div className="section-shell flex flex-col items-center gap-3 p-6 text-center">
        <Avatar
          user={{ display_name: profile.display_name, avatar_url: profile.avatar_url }}
          size="lg"
        />
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            {profile.display_name ?? 'Traveler'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            Member since {memberSince}
          </p>
        </div>
      </div>

      {/* Edit display name */}
      <div className="section-shell p-5 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--color-border-muted)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Profile
          </h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-text-subtle)' }}>
              <User className="h-3.5 w-3.5" />
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="input w-full"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--color-text-subtle)' }}>
              <Mail className="h-3.5 w-3.5" />
              Email
            </label>
            <input
              type="email"
              value={profile.email ?? ''}
              readOnly
              className="input w-full opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Trip stats */}
      <div className="section-shell p-5 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--color-border-muted)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            My Trips
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={<Plane className="h-4 w-4" />}
            value={profile.tripCount}
            label="Total"
            color="teal"
          />
          <StatTile
            icon={<Crown className="h-4 w-4" />}
            value={profile.ownedTripCount}
            label="Owned"
            color="indigo"
          />
          <StatTile
            icon={<CalendarDays className="h-4 w-4" />}
            value={profile.tripCount - profile.ownedTripCount}
            label="Joined"
            color="amber"
          />
        </div>
      </div>

      {/* Sign out */}
      <div className="section-shell p-5 space-y-4">
        <div className="border-b pb-3" style={{ borderColor: 'var(--color-border-muted)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Account
          </h2>
        </div>

        <button
          type="button"
          onClick={() => startSignOutTransition(async () => { await signOut(); })}
          disabled={isSigningOut}
          className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 min-h-[44px]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'teal' | 'indigo' | 'amber';
}) {
  const colors = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  };
  const { bg, text } = colors[color];

  return (
    <div className="metric-tile flex flex-col items-center gap-1.5 rounded-xl p-3 text-center">
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${text}`}>
        {icon}
      </span>
      <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
        {value}
      </span>
      <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-subtle)' }}>
        {label}
      </span>
    </div>
  );
}
