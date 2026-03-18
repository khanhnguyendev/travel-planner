'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { logActivity } from '@/lib/activity';
import type { ActionResult } from '@/features/auth/actions';
import type { PlaceVote } from '@/lib/types';

// -------------------------------------------------------
// Schemas
// -------------------------------------------------------

const upsertVoteSchema = z
  .object({
    projectId: z.string().uuid(),
    placeId: z.string().uuid(),
    voteType: z.enum(['upvote', 'downvote', 'score']),
    score: z.number().int().min(1).max(10).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.voteType === 'score' && (data.score == null)) {
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

const deleteVoteSchema = z.object({
  projectId: z.string().uuid(),
  placeId: z.string().uuid(),
});

// -------------------------------------------------------
// upsertVote
// -------------------------------------------------------

export async function upsertVote(
  projectId: string,
  placeId: string,
  voteType: 'upvote' | 'downvote' | 'score',
  score?: number | null
): Promise<ActionResult<{ vote: PlaceVote }>> {
  const parsed = upsertVoteSchema.safeParse({
    projectId,
    placeId,
    voteType,
    score,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('place_votes')
    .upsert(
      {
        project_id: parsed.data.projectId,
        place_id: parsed.data.placeId,
        user_id: user.id,
        vote_type: parsed.data.voteType,
        score: parsed.data.score ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'place_id,user_id' }
    )
    .select('*')
    .single();

  if (error) {
    createLogger({ action: 'upsertVote', userId: user.id }).error('vote.upsert.failed', { error: error.message, placeId, projectId });
    return { ok: false, error: 'Failed to save vote' };
  }

  const activityAction = parsed.data.voteType === 'upvote' ? 'vote.upvote' : 'vote.downvote';
  void logActivity({ projectId, userId: user.id, action: activityAction, entityType: 'place', entityId: placeId });

  return { ok: true, data: { vote: data as PlaceVote } };
}

// -------------------------------------------------------
// deleteVote
// -------------------------------------------------------

export async function deleteVote(
  projectId: string,
  placeId: string
): Promise<ActionResult> {
  const parsed = deleteVoteSchema.safeParse({ projectId, placeId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('place_votes')
    .delete()
    .eq('place_id', parsed.data.placeId)
    .eq('user_id', user.id)
    .eq('project_id', parsed.data.projectId);

  if (error) {
    console.error('deleteVote error:', error);
    return { ok: false, error: 'Failed to delete vote' };
  }

  return { ok: true, data: undefined };
}
