import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { buildSignInPath } from '@/features/auth/redirects';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripInvite, TripRole } from '@/lib/types';

// -------------------------------------------------------
// Accept invite page (server component)
// Reads ?token= from searchParams, processes inline
// -------------------------------------------------------

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Validate token param
  if (!token) {
    return <ErrorView message="Missing invite token. Please use the full invite link." />;
  }

  const user = await getSession();
  if (!user) {
    redirect(buildSignInPath(`/invites/accept?token=${token}`));
  }

  const admin = createAdminClient();

  // Look up invite
  const { data: inviteData, error: lookupError } = await admin
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (lookupError) {
    console.error('acceptInvite lookup error:', lookupError);
    return <ErrorView message="An error occurred while looking up the invite." />;
  }

  const invite = inviteData as TripInvite | null;

  if (!invite) {
    return <ErrorView message="Invite not found. It may have already been used or revoked." />;
  }

  if (invite.status === 'revoked') {
    return <ErrorView message="This invite has been revoked." />;
  }

  if (invite.status === 'accepted') {
    // Already accepted — redirect to the trip
    redirect(`/trips/${invite.trip_id}`);
  }

  if (new Date(invite.expires_at) < new Date()) {
    await admin
      .from('trip_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return <ErrorView message="This invite has expired. Please ask the trip owner to send a new one." />;
  }

  // Check if user is already a member
  const { data: existingMember } = await admin
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    // Create member row
    const { error: memberError } = await admin.from('trip_members').insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role as TripRole,
      invite_status: 'accepted',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error('acceptInvite member insert error:', memberError);
      return <ErrorView message="Failed to add you to the trip. Please try again." />;
    }
  }

  // Mark invite as accepted
  await admin
    .from('trip_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  // Redirect to the trip
  redirect(`/trips/${invite.trip_id}`);
}

// -------------------------------------------------------
// Error view
// -------------------------------------------------------

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-in fade-in duration-300">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#FEE2E2' }}
      >
        <AlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        Could not accept invite
      </h1>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>
      <Link
        href="/dashboard"
        className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
