/**
 * Fire-and-forget activity logging for the trip activity feed.
 * Never throws — a logging failure must never crash the main operation.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type ActivityAction =
  | 'trip.create'
  | 'trip.date_update'
  | 'place.add'
  | 'place.delete'
  | 'comment.add'
  | 'vote.upvote'
  | 'vote.downvote'
  | 'expense.add'
  | 'expense.delete'
  | 'category.add'
  | 'member.join'
  | 'place.checkin'
  | 'place.checkout';

export async function logActivity(params: {
  tripId: string;
  userId: string;
  action: ActivityAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('trip_activity').insert({
      trip_id: params.tripId,
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
