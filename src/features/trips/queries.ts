import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/features/auth/session';
import type { Trip, TripRole, BudgetContribution } from '@/lib/types';

export interface TripWithRole extends Trip {
  myRole: TripRole;
}

export async function getPublicTrips(): Promise<Trip[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('trips')
    .select('*')
    .eq('visibility', 'public')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getPublicTrips error:', error);
    return [];
  }

  return (data ?? []) as unknown as Trip[];
}

/**
 * Returns all trips the current user is an accepted member of,
 * including their role, ordered by most recently updated.
 */
export async function getTrips(): Promise<TripWithRole[]> {
  const supabase = await createClient();
  const user = await getSession();

  if (!user) return [];

  // Fetch trips where the user is an accepted member
  const { data, error } = await supabase
    .from('trips')
    .select(
      `
      *,
      trip_members!inner(user_id, invite_status, role)
    `
    )
    .eq('trip_members.user_id', user.id)
    .eq('trip_members.invite_status', 'accepted')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getTrips error:', error);
    return [];
  }

  // Cast the entire result to avoid SSR client type resolution issues
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const pm = (row.trip_members as Array<{ role: string }> | null)?.[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { trip_members: _pm, ...trip } = row;
    return { ...(trip as unknown as Trip), myRole: (pm?.role ?? 'viewer') as TripRole };
  });
}

/**
 * Returns a single trip by ID. RLS ensures the user must be a member.
 */
export async function getTrip(id: string): Promise<Trip | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getTrip error:', error);
    return null;
  }

  return data as unknown as Trip;
}

/**
 * Returns the current user's role in a trip, or null if not a member.
 */
export async function getUserRole(
  tripId: string
): Promise<TripRole | null> {
  const supabase = await createClient();
  const user = await getSession();

  if (!user) return null;

  const { data, error } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  if (error) return null;

  return ((data as unknown as { role: string }) ?.role as TripRole) ?? null;
}

/**
 * Returns all budget contributions for a trip, ordered by creation time.
 */
export async function getBudgetContributions(tripId: string): Promise<BudgetContribution[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('budget_contributions')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getBudgetContributions error:', error);
    return [];
  }

  return (data ?? []) as unknown as BudgetContribution[];
}
