'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';

// -------------------------------------------------------
// deletePlace
// -------------------------------------------------------

export async function deletePlace(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Fetch project_id before deleting for revalidation.
  const { data: placeData } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();
  const place = placeData as { project_id: string } | null;

  const admin = createAdminClient();
  const { error } = await admin.from('places').delete().eq('id', id);

  if (error) {
    console.error('deletePlace error:', error);
    return { ok: false, error: 'Failed to delete place' };
  }

  if (place) {
    revalidatePath(`/projects/${place.project_id}`);
  }

  return { ok: true, data: undefined };
}
