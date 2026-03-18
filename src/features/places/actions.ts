'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEditor, requireMember } from '@/lib/membership';
import { createLogger } from '@/lib/logger';
import { logActivity } from '@/lib/activity';
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

  // Resolve the place's trip using the admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: placeData } = await admin
    .from('places')
    .select('trip_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { trip_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  // Must be editor or above
  const role = await requireEditor(place.trip_id, user.id);
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

  revalidatePath(`/trips/${place.trip_id}`);
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
    .select('trip_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { trip_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.trip_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({ note: note ?? null })
    .eq('id', placeId);

  if (error) {
    console.error('updatePlaceNote error:', error);
    return { ok: false, error: 'Failed to save note' };
  }

  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// deletePlace
// -------------------------------------------------------

export async function deletePlace(id: string): Promise<ActionResult> {
  const log = createLogger({ action: 'deletePlace' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  log.info('place.delete.start', { userId: user.id, placeId: id });

  const admin = createAdminClient();

  const { data: placeData } = await admin
    .from('places')
    .select('trip_id, name')
    .eq('id', id)
    .single();
  const place = placeData as { trip_id: string; name: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.trip_id, user.id);
  if (!role) { log.warn('place.delete.forbidden', { userId: user.id }); return { ok: false, error: 'Insufficient permissions' }; }

  const { error } = await admin.from('places').delete().eq('id', id);

  if (error) {
    log.error('place.delete.failed', { error: error.message, placeId: id, tripId: place.trip_id });
    return { ok: false, error: 'Failed to delete place' };
  }

  log.info('place.delete.ok', { placeId: id, tripId: place.trip_id });
  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// addPlaceComment
// -------------------------------------------------------

export async function addPlaceComment(
  placeId: string,
  tripId: string,
  body: string
): Promise<{ ok: true; data: PlaceComment } | { ok: false; error: string }> {
  const log = createLogger({ action: 'addPlaceComment', tripId });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const role = await requireMember(tripId, user.id);
  if (!role) { log.warn('comment.add.forbidden', { userId: user.id }); return { ok: false, error: 'Not a member of this trip' }; }

  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 1000) return { ok: false, error: 'Invalid comment' };

  const admin = createAdminClient();

  // Fetch place name for activity meta
  const { data: placeData } = await admin.from('places').select('name').eq('id', placeId).single();
  const placeName = (placeData as { name: string } | null)?.name ?? '';

  const { data, error } = await admin
    .from('place_comments')
    .insert({ place_id: placeId, trip_id: tripId, user_id: user.id, body: trimmed })
    .select()
    .single();

  if (error || !data) {
    log.error('comment.add.failed', { error: error?.message, placeId, tripId });
    return { ok: false, error: 'Failed to add comment' };
  }

  log.info('comment.add.ok', { commentId: (data as PlaceComment).id, placeId, tripId });
  void logActivity({ tripId, userId: user.id, action: 'comment.add', entityType: 'place', entityId: placeId, meta: { placeName, body: trimmed.slice(0, 100) } });

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: data as PlaceComment };
}

// -------------------------------------------------------
// deletePlaceComment
// -------------------------------------------------------

export async function deletePlaceComment(
  commentId: string,
  tripId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Verify membership
  const role = await requireMember(tripId, user.id);
  if (!role) return { ok: false, error: 'Not a member of this trip' };

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

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: undefined };
}
