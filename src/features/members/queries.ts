import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripMember, TripInvite, Profile } from '@/lib/types';

/**
 * Returns all pending (non-expired, non-revoked) invites for a trip.
 * Uses admin client because the token column requires service-role access.
 * Token is included so invite links can be shared.
 */
export type PendingInvite = TripInvite;

export async function getPendingInvites(
  tripId: string
): Promise<PendingInvite[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('trip_invites')
    .select('id, trip_id, email, invited_by_user_id, token, role, status, expires_at, created_at')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getPendingInvites error:', error);
    return [];
  }

  return (data ?? []) as PendingInvite[];
}

export type MemberWithProfile = TripMember & {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
};

/**
 * Returns all accepted members of a trip with their profile information.
 */
export async function getMembers(
  tripId: string
): Promise<MemberWithProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trip_members')
    .select(
      `
      *,
      profile:profiles(id, display_name, avatar_url)
    `
    )
    .eq('trip_id', tripId)
    .eq('invite_status', 'accepted')
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('getMembers error:', error);
    return [];
  }

  return (data ?? []) as MemberWithProfile[];
}
