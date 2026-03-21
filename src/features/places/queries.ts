import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Place, PlaceReview, PlaceComment } from '@/lib/types';

export type PlaceWithReviews = Place & { reviews: PlaceReview[] };

/**
 * Returns all places for a trip, optionally filtered by category.
 */
export async function getPlaces(
  tripId: string,
  categoryId?: string
): Promise<Place[]> {
  const supabase = await createClient();

  let query = supabase
    .from('places')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getPlaces error:', error);
    return [];
  }

  return (data ?? []) as Place[];
}

/**
 * Returns a single place by ID with its reviews.
 * RLS ensures the caller is a trip member.
 */
export async function getPlace(id: string): Promise<PlaceWithReviews | null> {
  const supabase = await createClient();

  const { data: place, error: placeError } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();

  if (placeError || !place) {
    console.error('getPlace error:', placeError);
    return null;
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from('place_reviews')
    .select('*')
    .eq('place_id', id)
    .order('rating', { ascending: false });

  if (reviewsError) {
    console.error('getPlace reviews error:', reviewsError);
  }

  return {
    ...(place as Place),
    reviews: (reviews ?? []) as PlaceReview[],
  };
}

/**
 * Returns a map of place_id → tag_ids[] for all places in a trip.
 * Used for client-side tag filtering without loading full Tag objects per place.
 */
export async function getPlaceTagIdsByTrip(
  tripId: string
): Promise<Record<string, string[]>> {
  const admin = createAdminClient();

  // Get all place IDs for this trip first, then fetch their place_tags
  const { data: placesData } = await admin
    .from('places')
    .select('id')
    .eq('trip_id', tripId);

  if (!placesData?.length) return {};

  const placeIds = (placesData as { id: string }[]).map((p) => p.id);

  const { data, error } = await admin
    .from('place_tags')
    .select('place_id, tag_id')
    .in('place_id', placeIds);

  if (error) {
    console.error('getPlaceTagIdsByTrip error:', error);
    return {};
  }

  const result: Record<string, string[]> = {};
  for (const row of (data ?? []) as { place_id: string; tag_id: string }[]) {
    if (!result[row.place_id]) result[row.place_id] = [];
    result[row.place_id].push(row.tag_id);
  }
  return result;
}

export async function getCommentsByTripId(
  tripId: string
): Promise<PlaceComment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('place_comments')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getCommentsByTripId error:', error);
    return [];
  }
  return (data ?? []) as PlaceComment[];
}
