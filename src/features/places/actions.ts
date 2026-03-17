'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { PlaceComment } from '@/lib/types';

export interface PlaceScheduleInput {
  visit_date?: string | null;
  visit_time_from?: string | null;
  visit_time_to?: string | null;
  backup_place_id?: string | null;
}

export async function updatePlaceSchedule(
  placeId: string,
  schedule: PlaceScheduleInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data: placeData } = await supabase
    .from('places')
    .select('project_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { project_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('places')
    .update({
      visit_date: schedule.visit_date ?? null,
      visit_time_from: schedule.visit_time_from ?? null,
      visit_time_to: schedule.visit_time_to ?? null,
      backup_place_id: schedule.backup_place_id ?? null,
    })
    .eq('id', placeId);

  if (error) {
    console.error('updatePlaceSchedule error:', error);
    return { ok: false, error: 'Failed to update schedule' };
  }

  revalidatePath(`/projects/${place.project_id}`);
  return { ok: true, data: undefined };
}

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

// -------------------------------------------------------
// addPlaceComment
// -------------------------------------------------------

export async function addPlaceComment(
  placeId: string,
  projectId: string,
  body: string
): Promise<{ ok: true; data: PlaceComment } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 1000) return { ok: false, error: 'Invalid comment' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('place_comments')
    .insert({ place_id: placeId, project_id: projectId, user_id: user.id, body: trimmed })
    .select()
    .single();

  if (error || !data) {
    console.error('addPlaceComment error:', error);
    return { ok: false, error: 'Failed to add comment' };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: data as PlaceComment };
}

// -------------------------------------------------------
// deletePlaceComment
// -------------------------------------------------------

export async function deletePlaceComment(
  commentId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('place_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('deletePlaceComment error:', error);
    return { ok: false, error: 'Failed to delete comment' };
  }

  revalidatePath(`/projects/${projectId}`);
  return { ok: true, data: undefined };
}
