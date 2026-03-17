import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectMember, ProjectInvite, Profile } from '@/lib/types';

/**
 * Returns all pending (non-expired, non-revoked) invites for a project.
 * Uses admin client because the token column requires service-role access.
 * The token is excluded from the returned type.
 */
export type PendingInvite = Omit<ProjectInvite, 'token'>;

export async function getPendingInvites(
  projectId: string
): Promise<PendingInvite[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('project_invites')
    .select('id, project_id, email, invited_by_user_id, role, status, expires_at, created_at')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getPendingInvites error:', error);
    return [];
  }

  return (data ?? []) as PendingInvite[];
}

export type MemberWithProfile = ProjectMember & {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
};

/**
 * Returns all accepted members of a project with their profile information.
 */
export async function getMembers(
  projectId: string
): Promise<MemberWithProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_members')
    .select(
      `
      *,
      profile:profiles(id, display_name, avatar_url)
    `
    )
    .eq('project_id', projectId)
    .eq('invite_status', 'accepted')
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('getMembers error:', error);
    return [];
  }

  return (data ?? []) as MemberWithProfile[];
}
