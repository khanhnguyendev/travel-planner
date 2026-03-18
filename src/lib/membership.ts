/**
 * Server-side membership verification helpers.
 * Always uses the admin client so the check works regardless of RLS state.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripRole } from '@/lib/types';

const EDITOR_ROLES: TripRole[] = ['owner', 'admin', 'editor'];

/**
 * Returns the user's accepted role in a trip, or null if not a member.
 */
export async function getProjectRole(
  tripId: string,
  userId: string
): Promise<TripRole | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();
  return (data as { role: TripRole } | null)?.role ?? null;
}

/**
 * Asserts the user is an accepted member. Returns the role.
 * Returns null if not a member.
 */
export async function requireMember(
  tripId: string,
  userId: string
): Promise<TripRole | null> {
  return getProjectRole(tripId, userId);
}

/**
 * Asserts the user has editor-or-above role (owner | admin | editor).
 * Returns the role if allowed, null otherwise.
 */
export async function requireEditor(
  tripId: string,
  userId: string
): Promise<TripRole | null> {
  const role = await getProjectRole(tripId, userId);
  if (!role || !EDITOR_ROLES.includes(role)) return null;
  return role;
}
