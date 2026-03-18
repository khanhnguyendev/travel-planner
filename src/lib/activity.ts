/**
 * Fire-and-forget activity logging for the project activity feed.
 * Never throws — a logging failure must never crash the main operation.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type ActivityAction =
  | 'place.add'
  | 'place.delete'
  | 'comment.add'
  | 'vote.upvote'
  | 'vote.downvote'
  | 'expense.add'
  | 'category.add'
  | 'member.join';

export async function logActivity(params: {
  projectId: string;
  userId: string;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('project_activity').insert({
      project_id: params.projectId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      meta: params.meta ?? null,
    });
  } catch (err) {
    console.error('[activity] log failed:', err);
  }
}
