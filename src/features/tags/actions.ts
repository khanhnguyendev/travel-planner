'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import type { Tag } from '@/lib/types';

// -------------------------------------------------------
// createTag
// -------------------------------------------------------

export async function createTag(
  tripId: string,
  name: string,
  options?: { color?: string | null; isAuto?: boolean }
): Promise<ActionResult<{ tag: Tag }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Name is required' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tags')
    .insert({
      trip_id: tripId,
      name: trimmed,
      color: options?.color ?? null,
      is_auto: options?.isAuto ?? false,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'A tag with this name already exists' };
    console.error('createTag error:', error);
    return { ok: false, error: 'Failed to create tag' };
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: { tag: data as Tag } };
}

// -------------------------------------------------------
// deleteTag
// -------------------------------------------------------

export async function deleteTag(tagId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  const { data: tagData } = await admin
    .from('tags')
    .select('trip_id')
    .eq('id', tagId)
    .single();
  const tag = tagData as { trip_id: string } | null;
  if (!tag) return { ok: false, error: 'Tag not found' };

  const { error } = await admin.from('tags').delete().eq('id', tagId);
  if (error) {
    console.error('deleteTag error:', error);
    return { ok: false, error: 'Failed to delete tag' };
  }

  revalidatePath(`/trips/${tag.trip_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// syncLocationTags
// Syncs auto-generated tags to match the new locations list.
// Adds tags for new locations, removes orphaned auto-tags whose
// location was removed AND have no places assigned.
// -------------------------------------------------------

export async function syncLocationTags(
  tripId: string,
  newLocations: string[]
): Promise<void> {
  const admin = createAdminClient();

  // Fetch existing auto-tags for this trip
  const { data: existingData } = await admin
    .from('tags')
    .select('id, name')
    .eq('trip_id', tripId)
    .eq('is_auto', true);

  const existing = (existingData ?? []) as { id: string; name: string }[];
  const existingByName = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const newSet = new Set(newLocations.map((l) => l.trim().toLowerCase()).filter(Boolean));

  // Insert new auto-tags for locations that don't have a tag yet
  const toCreate = newLocations
    .filter((l) => l.trim() && !existingByName.has(l.trim().toLowerCase()))
    .map((l) => ({ trip_id: tripId, name: l.trim(), is_auto: true, color: null }));

  if (toCreate.length > 0) {
    const { error } = await admin.from('tags').insert(toCreate);
    if (error) console.error('syncLocationTags insert error:', error);
  }

  // Remove auto-tags whose location was dropped, but only if no places use them
  const toRemove = existing.filter((t) => !newSet.has(t.name.toLowerCase()));

  for (const tag of toRemove) {
    const { count } = await admin
      .from('place_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tag.id);

    if ((count ?? 0) === 0) {
      await admin.from('tags').delete().eq('id', tag.id);
    }
    // If count > 0, leave the tag intact — user must manually remove it
  }
}

// -------------------------------------------------------
// setPlaceTags
// Replaces all tags for a place with the given tag IDs.
// -------------------------------------------------------

export async function setPlaceTags(
  placeId: string,
  tagIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Get tripId for revalidation
  const { data: placeData } = await admin
    .from('places')
    .select('trip_id')
    .eq('id', placeId)
    .single();
  const place = placeData as { trip_id: string } | null;
  if (!place) return { ok: false, error: 'Place not found' };

  // Delete existing and reinsert
  await admin.from('place_tags').delete().eq('place_id', placeId);

  if (tagIds.length > 0) {
    const rows = tagIds.map((tag_id) => ({ place_id: placeId, tag_id }));
    const { error } = await admin.from('place_tags').insert(rows);
    if (error) {
      console.error('setPlaceTags insert error:', error);
      return { ok: false, error: 'Failed to update tags' };
    }
  }

  revalidatePath(`/trips/${place.trip_id}`);
  return { ok: true, data: undefined };
}
