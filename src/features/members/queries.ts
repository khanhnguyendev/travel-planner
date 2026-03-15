import { createClient } from '@/lib/supabase/server';
import type { ProjectMember, Profile } from '@/lib/types';

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
