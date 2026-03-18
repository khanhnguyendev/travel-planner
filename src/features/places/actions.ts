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

export type ConflictingPlace = { id: string; name: string; visit_time_from: string; visit_time_to: string | null };

export type PlaceScheduleResult =
  | { ok: true; data: undefined; conflicts?: ConflictingPlace[] }
  | { ok: false; error: string };

// Returns true if time windows [from1, to1) and [from2, to2) overlap.
// Falls back to a 90-min duration when the end time is missing.
function timeWindowsOverlap(
  from1: string, to1: string | null,
  from2: string, to2: string | null,
): boolean {
  function toMins(t: string) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  function addMins(t: string, delta: number) { return toMins(t) + delta; }
  const s1 = toMins(from1);
  const e1 = to1 ? toMins(to1) : addMins(from1, 90);
  const s2 = toMins(from2);
  const e2 = to2 ? toMins(to2) : addMins(from2, 90);
  return s1 < e2 && s2 < e1;
}

export async function updatePlaceSchedule(
  placeId: string,
  schedule: PlaceScheduleInput
): Promise<PlaceScheduleResult> {
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

  // Detect conflicts with sibling places on the same date
  let conflicts: ConflictingPlace[] | undefined;
  if (schedule.visit_date && schedule.visit_time_from) {
    const { data: siblings } = await admin
      .from('places')
      .select('id, name, visit_time_from, visit_time_to')
      .eq('trip_id', place.trip_id)
      .eq('visit_date', schedule.visit_date)
      .neq('id', placeId);

    if (siblings) {
      conflicts = (siblings as ConflictingPlace[]).filter((s) =>
        s.visit_time_from &&
        timeWindowsOverlap(
          schedule.visit_time_from!, schedule.visit_time_to ?? null,
          s.visit_time_from, s.visit_time_to,
        )
      );
      if (conflicts.length === 0) conflicts = undefined;
    }
  }

  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: undefined, conflicts };
}

// -------------------------------------------------------
// addMinutesToTime
// -------------------------------------------------------

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// -------------------------------------------------------
// checkInPlace
// -------------------------------------------------------

export type CheckInResult =
  | { ok: true; data: { delayMinutes: number; downstreamCount: number } }
  | { ok: false; error: string };

export async function checkInPlace(
  placeId: string,
  checkinAt: string, // ISO timestamp
): Promise<CheckInResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: placeData } = await admin
    .from('places')
    .select('trip_id, name, visit_date, visit_time_from')
    .eq('id', placeId)
    .single();

  const place = placeData as {
    trip_id: string; name: string;
    visit_date: string | null; visit_time_from: string | null;
  } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.trip_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({ actual_checkin_at: checkinAt, actual_checkout_at: null })
    .eq('id', placeId);

  if (error) {
    console.error('checkInPlace error:', error);
    return { ok: false, error: 'Failed to check in' };
  }

  void logActivity({
    tripId: place.trip_id, userId: user.id, action: 'place.checkin',
    entityType: 'place', entityId: placeId, meta: { placeName: place.name, checkinAt },
  });

  // Calculate delay vs planned time
  let delayMinutes = 0;
  let downstreamCount = 0;

  if (place.visit_date && place.visit_time_from) {
    const plannedTs = new Date(`${place.visit_date}T${place.visit_time_from}:00`).getTime();
    const actualTs = new Date(checkinAt).getTime();
    delayMinutes = Math.round((actualTs - plannedTs) / 60_000);

    if (delayMinutes > 0) {
      // Count downstream places on the same day
      const { data: downstream } = await admin
        .from('places')
        .select('id')
        .eq('trip_id', place.trip_id)
        .eq('visit_date', place.visit_date)
        .gt('visit_time_from', place.visit_time_from);
      downstreamCount = downstream?.length ?? 0;
    }
  }

  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: { delayMinutes, downstreamCount } };
}

// -------------------------------------------------------
// checkOutPlace
// -------------------------------------------------------

export async function checkOutPlace(
  placeId: string,
  checkoutAt: string, // ISO timestamp
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: placeData } = await admin
    .from('places')
    .select('trip_id, name')
    .eq('id', placeId)
    .single();

  const place = placeData as { trip_id: string; name: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.trip_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({ actual_checkout_at: checkoutAt })
    .eq('id', placeId);

  if (error) {
    console.error('checkOutPlace error:', error);
    return { ok: false, error: 'Failed to check out' };
  }

  void logActivity({
    tripId: place.trip_id, userId: user.id, action: 'place.checkout',
    entityType: 'place', entityId: placeId, meta: { placeName: place.name, checkoutAt },
  });

  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// cascadePlaceDelay
// -------------------------------------------------------

export async function cascadePlaceDelay(
  tripId: string,
  anchorPlaceId: string,
  delayMinutes: number,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const role = await requireEditor(tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const admin = createAdminClient();

  // Get the anchor place's date + time
  const { data: anchor } = await admin
    .from('places')
    .select('visit_date, visit_time_from')
    .eq('id', anchorPlaceId)
    .single();

  const a = anchor as { visit_date: string | null; visit_time_from: string | null } | null;
  if (!a?.visit_date || !a.visit_time_from) return { ok: false, error: 'Anchor has no schedule' };

  // Fetch all downstream places (same date, later start time, excluding anchor)
  const { data: downstream } = await admin
    .from('places')
    .select('id, visit_time_from, visit_time_to')
    .eq('trip_id', tripId)
    .eq('visit_date', a.visit_date)
    .gt('visit_time_from', a.visit_time_from)
    .neq('id', anchorPlaceId);

  if (!downstream || downstream.length === 0) {
    return { ok: true, data: undefined };
  }

  type Row = { id: string; visit_time_from: string; visit_time_to: string | null };

  // Update each downstream place
  await Promise.all(
    (downstream as Row[]).map((p) => {
      const newFrom = addMinutesToTime(p.visit_time_from, delayMinutes);
      const newTo = p.visit_time_to
        ? addMinutesToTime(p.visit_time_to, delayMinutes)
        : null;
      return admin.from('places').update({ visit_time_from: newFrom, visit_time_to: newTo }).eq('id', p.id);
    })
  );

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// clearPlaceCheckin
// -------------------------------------------------------

export async function clearPlaceCheckin(placeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: placeData } = await admin.from('places').select('trip_id').eq('id', placeId).single();
  const place = placeData as { trip_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  const role = await requireEditor(place.trip_id, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const { error } = await admin
    .from('places')
    .update({ actual_checkin_at: null, actual_checkout_at: null })
    .eq('id', placeId);

  if (error) return { ok: false, error: 'Failed to clear check-in' };

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
  void logActivity({
    tripId: place.trip_id,
    userId: user.id,
    action: 'place.delete',
    entityType: 'place',
    entityId: id,
    meta: { placeName: place.name },
  });
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
