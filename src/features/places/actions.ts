'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEditor, requireMember } from '@/lib/membership';
import type { ActionResult } from '@/features/auth/actions';
import type { PlaceComment } from '@/lib/types';

export interface PlaceScheduleInput {
  visit_date?: string | null;
  visit_time_from?: string | null;
  visit_time_to?: string | null;
  backup_place_id?: string | null;
  checkout_date?: string | null;
}

export async function updatePlaceSchedule(
  placeId: string,
  schedule: PlaceScheduleInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Resolve the place's project using the admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: placeData } = await admin
    .from('places')
    .select('project_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { project_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  // Must be editor or above
  const role = await requireEditor(place.project_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({
      visit_date: schedule.visit_date ?? null,
      visit_time_from: schedule.visit_time_from ?? null,
      visit_time_to: schedule.visit_time_to ?? null,
      backup_place_id: schedule.backup_place_id ?? null,
      checkout_date: schedule.checkout_date ?? null,
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
// updatePlaceNote
// -------------------------------------------------------

export async function updatePlaceNote(
  placeId: string,
  note: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: placeData } = await admin
    .from('places')
    .select('project_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { project_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.project_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({ note: note ?? null })
    .eq('id', placeId);

  if (error) {
    console.error('updatePlaceNote error:', error);
    return { ok: false, error: 'Failed to save note' };
  }

  revalidatePath(`/projects/${place.project_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// deletePlace
// -------------------------------------------------------

export async function deletePlace(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Resolve project_id via admin client (bypasses RLS)
  const { data: placeData } = await admin
    .from('places')
    .select('project_id')
    .eq('id', id)
    .single();
  const place = placeData as { project_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  // Must be editor or above
  const role = await requireEditor(place.project_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin.from('places').delete().eq('id', id);

  if (error) {
    console.error('deletePlace error:', error);
    return { ok: false, error: 'Failed to delete place' };
  }

  revalidatePath(`/projects/${place.project_id}`);
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

  // Must be an accepted member (viewers can comment)
  const role = await requireMember(projectId, user.id);
  if (!role) return { ok: false, error: 'Not a member of this project' };

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

  // Verify membership
  const role = await requireMember(projectId, user.id);
  if (!role) return { ok: false, error: 'Not a member of this project' };

  // Fetch the comment to check ownership
  const { data: commentData } = await admin
    .from('place_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();
  const comment = commentData as { user_id: string } | null;
  if (!comment) return { ok: false, error: 'Comment not found' };

  // Only the author or admins/owners can delete
  const canDelete =
    comment.user_id === user.id ||
    role === 'owner' ||
    role === 'admin';
  if (!canDelete) return { ok: false, error: 'Insufficient permissions' };

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
