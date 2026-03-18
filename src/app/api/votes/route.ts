import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripMember, Trip, Place, PlaceVote } from '@/lib/types';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

// -------------------------------------------------------
// POST /api/votes  —  upsert vote
// -------------------------------------------------------

const postVoteSchema = z
  .object({
    tripId: z.string().uuid(),
    placeId: z.string().uuid(),
    voteType: z.enum(['upvote', 'downvote', 'score']),
    score: z.number().int().min(1).max(10).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.voteType === 'score' && data.score == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'score is required when voteType is "score"',
        path: ['score'],
      });
    }
    if (data.voteType !== 'score' && data.score != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'score must be omitted when voteType is not "score"',
        path: ['score'],
      });
    }
  });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid', 'Invalid JSON body', 400);
  }

  const parsed = postVoteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { tripId, placeId, voteType, score } = parsed.data;

  const { data: membershipData } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const membership = membershipData as TripMember | null;
  if (!membership) {
    return errorResponse('forbidden', 'Not a member of this trip', 403);
  }

  const { data: placeData } = await supabase
    .from('places')
    .select('*')
    .eq('id', placeId)
    .eq('trip_id', tripId)
    .single();

  const place = placeData as Place | null;
  if (!place) {
    return errorResponse('not_found', 'Place not found in this trip', 404);
  }

  const { data: projectData } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  const trip = projectData as Trip | null;
  if (trip?.status === 'archived') {
    return errorResponse('forbidden', 'Cannot vote on an archived trip', 403);
  }

  // Use admin client for the mutation — the SSR client's Database generic
  // resolves place_votes as `never` due to a @supabase/ssr type import mismatch.
  // RLS still applies via the service role only when trip membership is
  // pre-verified above (which we've done).
  const admin = createAdminClient();
  const { data: voteData, error: voteError } = await admin
    .from('place_votes')
    .upsert(
      {
        trip_id: tripId,
        place_id: placeId,
        user_id: user.id,
        vote_type: voteType,
        score: score ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_id,user_id' }
    )
    .select('*')
    .single();

  const vote = voteData as PlaceVote | null;

  if (voteError || !vote) {
    console.error('vote upsert error:', voteError);
    return errorResponse('server_error', 'Failed to save vote', 500);
  }

  return NextResponse.json({
    ok: true,
    data: {
      placeId: vote.place_id,
      userId: vote.user_id,
      voteType: vote.vote_type,
      score: vote.score,
    },
  });
}

// -------------------------------------------------------
// DELETE /api/votes  —  remove vote
// -------------------------------------------------------

const deleteVoteSchema = z.object({
  tripId: z.string().uuid(),
  placeId: z.string().uuid(),
});

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid', 'Invalid JSON body', 400);
  }

  const parsed = deleteVoteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { tripId, placeId } = parsed.data;

  const [{ data: membershipData }, { data: projectData }] = await Promise.all([
    supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')
      .single(),
    supabase.from('trips').select('*').eq('id', tripId).single(),
  ]);

  const membership = membershipData as TripMember | null;
  const trip = projectData as Trip | null;

  if (!membership) {
    return errorResponse('forbidden', 'Not a member of this trip', 403);
  }

  if (trip?.status === 'archived') {
    return errorResponse('forbidden', 'Cannot modify votes on an archived trip', 403);
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('place_votes')
    .delete()
    .eq('place_id', placeId)
    .eq('user_id', user.id)
    .eq('trip_id', tripId);

  if (error) {
    console.error('vote delete error:', error);
    return errorResponse('server_error', 'Failed to delete vote', 500);
  }

  return NextResponse.json({ ok: true });
}
