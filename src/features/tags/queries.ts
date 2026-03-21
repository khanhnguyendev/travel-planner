import { createAdminClient } from '@/lib/supabase/admin';
import type { Tag } from '@/lib/types';

export async function getTagsByTrip(tripId: string): Promise<Tag[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('tags')
    .select('*')
    .eq('trip_id', tripId)
    .order('is_auto', { ascending: false })
    .order('name');

  if (error) {
    console.error('getTagsByTrip error:', error);
    return [];
  }

  return (data ?? []) as Tag[];
}

export async function getTagsByPlace(placeId: string): Promise<Tag[]> {
  const admin = createAdminClient();

  const { data: ptData, error: ptError } = await admin
    .from('place_tags')
    .select('tag_id')
    .eq('place_id', placeId);

  if (ptError || !ptData?.length) return [];

  const tagIds = (ptData as { tag_id: string }[]).map((r) => r.tag_id);

  const { data, error } = await admin
    .from('tags')
    .select('*')
    .in('id', tagIds);

  if (error) {
    console.error('getTagsByPlace error:', error);
    return [];
  }

  return (data ?? []) as Tag[];
}

export async function getTagIdsByPlace(placeId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('place_tags')
    .select('tag_id')
    .eq('place_id', placeId);

  if (error) return [];
  return ((data ?? []) as { tag_id: string }[]).map((r) => r.tag_id);
}
