import { createAdminClient } from '@/lib/supabase/admin';

export interface ActivityEntry {
  id: string;
  project_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getProjectActivity(projectId: string): Promise<ActivityEntry[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('project_activity')
    .select('*, profiles(display_name, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) {
    console.error('[activity] getProjectActivity error:', error);
    return [];
  }

  return ((data ?? []) as unknown as Array<ActivityEntry & { profiles: ActivityEntry['profile'] }>)
    .map((row) => ({
      ...row,
      profile: row.profiles ?? null,
    }));
}
