import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export interface ProfileWithStats extends Profile {
  tripCount: number;
  ownedTripCount: number;
}

export async function getProfileWithStats(userId: string): Promise<ProfileWithStats | null> {
  const supabase = await createClient();

  const [{ data: profile, error: profileError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('trip_members')
        .select('role')
        .eq('user_id', userId)
        .eq('invite_status', 'accepted'),
    ]);

  if (profileError || !profile) {
    console.error('getProfileWithStats error:', profileError);
    return null;
  }

  const trips = (memberships ?? []) as { role: string }[];
  const tripCount = trips.length;
  const ownedTripCount = trips.filter((m) => m.role === 'owner').length;

  return {
    ...(profile as Profile),
    tripCount,
    ownedTripCount,
  };
}
