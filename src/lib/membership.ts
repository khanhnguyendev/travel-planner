/**
 * Server-side membership verification helpers.
 * Always uses the admin client so the check works regardless of RLS state.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectRole } from '@/lib/types';

const EDITOR_ROLES: ProjectRole[] = ['owner', 'admin', 'editor'];

/**
 * Returns the user's accepted role in a project, or null if not a member.
 */
export async function getProjectRole(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();
  return (data as { role: ProjectRole } | null)?.role ?? null;
}

/**
 * Asserts the user is an accepted member. Returns the role.
 * Returns null if not a member.
 */
export async function requireMember(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  return getProjectRole(projectId, userId);
}

/**
 * Asserts the user has editor-or-above role (owner | admin | editor).
 * Returns the role if allowed, null otherwise.
 */
export async function requireEditor(
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const role = await getProjectRole(projectId, userId);
  if (!role || !EDITOR_ROLES.includes(role)) return null;
  return role;
}
