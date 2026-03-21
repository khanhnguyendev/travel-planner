import { createClient } from '@/lib/supabase/server';
import type { PlaceVote } from '@/lib/types';

export interface VoteSummaryEntry {
  placeId: string;
  upvotes: number;
  downvotes: number;
  avgScore: number | null;
  scoreCount: number;
}

/**
 * Returns all votes for a given place.
 */
export async function getVotesForPlace(placeId: string): Promise<PlaceVote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('place_votes')
    .select('*')
    .eq('place_id', placeId);

  if (error) {
    console.error('getVotesForPlace error:', error);
    return [];
  }

  return (data as unknown as PlaceVote[]) ?? [];
}

/**
 * Returns the current user's vote for a place, or null if they haven't voted.
 */
export async function getUserVote(
  placeId: string,
  userId: string
): Promise<PlaceVote | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('place_votes')
    .select('*')
    .eq('place_id', placeId)
    .eq('user_id', userId)
    .single();

  if (error) return null;

  return data as unknown as PlaceVote;
}

/**
 * Returns all votes by a user for a given trip in a single query.
 * Replaces the N+1 pattern of calling getUserVote per place.
 */
export async function getUserVotesForTrip(
  tripId: string,
  userId: string
): Promise<PlaceVote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('place_votes')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId);

  if (error) {
    console.error('getUserVotesForTrip error:', error);
    return [];
  }

  return (data as unknown as PlaceVote[]) ?? [];
}

/**
 * Returns an aggregate vote summary for all places in a trip.
 */
export async function getVoteSummary(
  tripId: string
): Promise<VoteSummaryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('place_votes')
    .select('*')
    .eq('trip_id', tripId);

  if (error) {
    console.error('getVoteSummary error:', error);
    return [];
  }

  const votes = (data as unknown as PlaceVote[]) ?? [];
  const map = new Map<string, VoteSummaryEntry>();

  for (const vote of votes) {
    if (!map.has(vote.place_id)) {
      map.set(vote.place_id, {
        placeId: vote.place_id,
        upvotes: 0,
        downvotes: 0,
        avgScore: null,
        scoreCount: 0,
      });
    }
    const entry = map.get(vote.place_id)!;

    if (vote.vote_type === 'upvote') entry.upvotes++;
    else if (vote.vote_type === 'downvote') entry.downvotes++;
    else if (vote.vote_type === 'score' && vote.score != null) {
      const totalScore =
        (entry.avgScore ?? 0) * entry.scoreCount + vote.score;
      entry.scoreCount++;
      entry.avgScore = totalScore / entry.scoreCount;
    }
  }

  return Array.from(map.values());
}
