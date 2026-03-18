'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { TripRole } from '@/lib/types';

// Role rank for privilege checks
const ROLE_RANK: Record<TripRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

// -------------------------------------------------------
// sendInvite
// -------------------------------------------------------

export async function sendInvite(
  tripId: string,
  email: string,
  role: TripRole = 'editor'
): Promise<ActionResult<{ inviteId: string; token: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify caller is owner or admin
  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role as TripRole | undefined;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can send invites' };
  }

  // Role cannot exceed the caller's own role
  if (ROLE_RANK[role] > ROLE_RANK[callerRole]) {
    return {
      ok: false,
      error: `Cannot invite someone with a role higher than your own (${callerRole})`,
    };
  }

  const admin = createAdminClient();

  // Prevent duplicate pending invite for same email+trip
  const { data: existing } = await admin
    .from('trip_invites')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return { ok: false, error: 'A pending invite already exists for this email' };
  }

  // Generate a cryptographically secure token (at least 32 bytes of random data)
  const tokenBytes = crypto.getRandomValues(new Uint8Array(48));
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteError } = await admin
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      email,
      invited_by_user_id: user.id,
      token,
      role,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (inviteError || !invite) {
    console.error('sendInvite error:', inviteError);
    return { ok: false, error: 'Failed to create invite' };
  }

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: { inviteId: (invite as { id: string }).id, token } };
}

// -------------------------------------------------------
// generateInviteLink
// -------------------------------------------------------

export async function generateInviteLink(
  tripId: string,
  role: TripRole = 'editor'
): Promise<ActionResult<{ inviteUrl: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role as TripRole | undefined;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can create invite links' };
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(48));
  const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { error } = await admin.from('trip_invites').insert({
    trip_id: tripId,
    email: `link-invite-${token.slice(0, 8)}@noemail.local`,
    invited_by_user_id: user.id,
    token,
    role,
    status: 'pending',
    expires_at: expiresAt,
  });

  if (error) {
    console.error('generateInviteLink error:', error);
    return { ok: false, error: 'Failed to generate invite link' };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const inviteUrl = `${siteUrl}/invite/accept?token=${token}`;

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: { inviteUrl } };
}

// -------------------------------------------------------
// acceptInvite
// -------------------------------------------------------

export async function acceptInvite(
  token: string
): Promise<ActionResult<{ tripId: string; role: TripRole }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  const { data: inviteData, error: lookupError } = await admin
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: 'Failed to look up invite' };
  }

  const invite = inviteData as {
    id: string;
    trip_id: string;
    role: string;
    status: string;
    expires_at: string;
  } | null;

  if (!invite) {
    return { ok: false, error: 'Invite not found' };
  }
  if (invite.status === 'revoked') {
    return { ok: false, error: 'This invite has been revoked' };
  }
  if (invite.status === 'accepted') {
    return { ok: true, data: { tripId: invite.trip_id, role: invite.role as TripRole } };
  }
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('trip_invites').update({ status: 'expired' }).eq('id', invite.id);
    return { ok: false, error: 'This invite has expired' };
  }

  // Check if already a member
  const { data: existing } = await admin
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin.from('trip_members').insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: invite.role as TripRole,
      invite_status: 'accepted',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error('acceptInvite member insert error:', memberError);
      return { ok: false, error: 'Failed to add member' };
    }
  }

  await admin.from('trip_invites').update({ status: 'accepted' }).eq('id', invite.id);

  revalidatePath(`/trips/${invite.trip_id}/members`);
  return { ok: true, data: { tripId: invite.trip_id, role: invite.role as TripRole } };
}

// -------------------------------------------------------
// revokeInvite
// -------------------------------------------------------

export async function revokeInvite(
  tripId: string,
  inviteId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify caller is owner or admin
  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can revoke invites' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('trip_id', tripId);

  if (error) {
    console.error('revokeInvite error:', error);
    return { ok: false, error: 'Failed to revoke invite' };
  }

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// removeMember
// -------------------------------------------------------

export async function removeMember(
  tripId: string,
  userId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify caller is owner or admin
  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can remove members' };
  }

  // Prevent removing the owner
  const { data: targetData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();

  const targetRole = (targetData as { role: string } | null)?.role;
  if (targetRole === 'owner') {
    return { ok: false, error: 'Cannot remove the trip owner' };
  }

  // Admin cannot remove another admin
  if (callerRole === 'admin' && targetRole === 'admin') {
    return { ok: false, error: 'Admin cannot remove another admin' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    console.error('removeMember error:', error);
    return { ok: false, error: 'Failed to remove member' };
  }

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// changeMemberRole
// -------------------------------------------------------

export async function changeMemberRole(
  tripId: string,
  userId: string,
  role: TripRole
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify caller is owner or admin
  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can change roles' };
  }

  // Prevent changing the owner's role
  const { data: targetData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();

  const targetRole = (targetData as { role: string } | null)?.role;
  if (targetRole === 'owner') {
    return { ok: false, error: "Cannot change the owner's role" };
  }

  // Admin cannot promote to owner or admin
  if (callerRole === 'admin' && ['owner', 'admin'].includes(role)) {
    return { ok: false, error: 'Admin cannot promote to owner or admin' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('trip_members')
    .update({ role })
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    console.error('changeMemberRole error:', error);
    return { ok: false, error: 'Failed to change role' };
  }

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true, data: undefined };
}
