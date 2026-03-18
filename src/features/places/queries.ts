import { createClient } from '@/lib/supabase/server';
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
