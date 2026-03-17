'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { ProjectRole } from '@/lib/types';

// Role rank for privilege checks
const ROLE_RANK: Record<ProjectRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

// -------------------------------------------------------
// sendInvite
// -------------------------------------------------------

export async function sendInvite(
  projectId: string,
  email: string,
  role: ProjectRole = 'editor'
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
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role as ProjectRole | undefined;
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

  // Prevent duplicate pending invite for same email+project
  const { data: existing } = await admin
    .from('project_invites')
    .select('id')
    .eq('project_id', projectId)
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
    .from('project_invites')
    .insert({
      project_id: projectId,
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

  revalidatePath(`/projects/${projectId}/members`);
  return { ok: true, data: { inviteId: (invite as { id: string }).id, token } };
}

// -------------------------------------------------------
// acceptInvite
// -------------------------------------------------------

export async function acceptInvite(
  token: string
): Promise<ActionResult<{ projectId: string; role: ProjectRole }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  const { data: inviteData, error: lookupError } = await admin
    .from('project_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, error: 'Failed to look up invite' };
  }

  const invite = inviteData as {
    id: string;
    project_id: string;
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
    return { ok: true, data: { projectId: invite.project_id, role: invite.role as ProjectRole } };
  }
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('project_invites').update({ status: 'expired' }).eq('id', invite.id);
    return { ok: false, error: 'This invite has expired' };
  }

  // Check if already a member
  const { data: existing } = await admin
    .from('project_members')
    .select('id')
    .eq('project_id', invite.project_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin.from('project_members').insert({
      project_id: invite.project_id,
      user_id: user.id,
      role: invite.role as ProjectRole,
      invite_status: 'accepted',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error('acceptInvite member insert error:', memberError);
      return { ok: false, error: 'Failed to add member' };
    }
  }

  await admin.from('project_invites').update({ status: 'accepted' }).eq('id', invite.id);

  revalidatePath(`/projects/${invite.project_id}/members`);
  return { ok: true, data: { projectId: invite.project_id, role: invite.role as ProjectRole } };
}

// -------------------------------------------------------
// revokeInvite
// -------------------------------------------------------

export async function revokeInvite(
  projectId: string,
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
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can revoke invites' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('project_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('project_id', projectId);

  if (error) {
    console.error('revokeInvite error:', error);
    return { ok: false, error: 'Failed to revoke invite' };
  }

  revalidatePath(`/projects/${projectId}/members`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// removeMember
// -------------------------------------------------------

export async function removeMember(
  projectId: string,
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
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can remove members' };
  }

  // Prevent removing the owner
  const { data: targetData } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();

  const targetRole = (targetData as { role: string } | null)?.role;
  if (targetRole === 'owner') {
    return { ok: false, error: 'Cannot remove the project owner' };
  }

  // Admin cannot remove another admin
  if (callerRole === 'admin' && targetRole === 'admin') {
    return { ok: false, error: 'Admin cannot remove another admin' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('removeMember error:', error);
    return { ok: false, error: 'Failed to remove member' };
  }

  revalidatePath(`/projects/${projectId}/members`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// changeMemberRole
// -------------------------------------------------------

export async function changeMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole
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
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return { ok: false, error: 'Only owner or admin can change roles' };
  }

  // Prevent changing the owner's role
  const { data: targetData } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
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
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('changeMemberRole error:', error);
    return { ok: false, error: 'Failed to change role' };
  }

  revalidatePath(`/projects/${projectId}/members`);
  return { ok: true, data: undefined };
}
