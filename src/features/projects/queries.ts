import { createClient } from '@/lib/supabase/server';
import type { Project, ProjectRole } from '@/lib/types';

export interface ProjectWithRole extends Project {
  myRole: ProjectRole;
}

/**
 * Returns all projects the current user is an accepted member of,
 * including their role, ordered by most recently updated.
 */
export async function getProjects(): Promise<ProjectWithRole[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch projects where the user is an accepted member
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      project_members!inner(user_id, invite_status, role)
    `
    )
    .eq('project_members.user_id', user.id)
    .eq('project_members.invite_status', 'accepted')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('getProjects error:', error);
    return [];
  }

  // Cast the entire result to avoid SSR client type resolution issues
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const pm = (row.project_members as Array<{ role: string }> | null)?.[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { project_members: _pm, ...project } = row;
    return { ...(project as unknown as Project), myRole: (pm?.role ?? 'viewer') as ProjectRole };
  });
}

/**
 * Returns a single project by ID. RLS ensures the user must be a member.
 */
export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getProject error:', error);
    return null;
  }

  return data as unknown as Project;
}

/**
 * Returns the current user's role in a project, or null if not a member.
 */
export async function getUserRole(
  projectId: string
): Promise<ProjectRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  if (error) return null;

  return ((data as unknown as { role: string }) ?.role as ProjectRole) ?? null;
}
