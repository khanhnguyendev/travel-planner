import { requireSession } from '@/features/auth/session';
import { getProfileWithStats } from '@/features/profile/queries';
import { ProfileForm } from '@/components/profile/profile-form';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requireSession();
  const profile = await getProfileWithStats(user.id);

  if (!profile) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          Profile
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-subtle)' }}>
          Manage your account details
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
