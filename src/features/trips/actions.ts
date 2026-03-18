'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/features/auth/actions';
import { logActivity } from '@/lib/activity';

function slog(service: string, msg: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const extra = data ? ' ' + JSON.stringify(data) : '';
  console.log(`[${ts}][${service}] ${msg}${extra}`);
}

// -------------------------------------------------------
// Schemas
// -------------------------------------------------------

const createTripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120),
  description: z.string().max(500).optional(),
  visibility: z.enum(['private', 'public']).default('private'),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().positive().optional().nullable(),
  budgetCurrency: z.string().length(3).optional(),
});

// -------------------------------------------------------
// createTrip
// -------------------------------------------------------

export async function createTrip(
  title: string,
  description: string | undefined,
  visibility: 'private' | 'public',
  startDate?: string | null,
  endDate?: string | null,
  budget?: number | null,
  budgetCurrency?: string
): Promise<ActionResult<{ tripId: string }>> {
  const parsed = createTripSchema.safeParse({
    title,
    description,
    visibility,
    startDate,
    endDate,
    budget,
    budgetCurrency,
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

  // Use admin client to bypass RLS on insert (trips insert is service-role only).
  const admin = createAdminClient();

  // Ensure profile exists before creating the trip (FK constraint).
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    display_name:
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'Traveler',
  });

  if (profileError) {
    console.error('Profile upsert error:', profileError);
    return { ok: false, error: 'Failed to initialize profile' };
  }

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .insert({
      owner_user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      visibility: parsed.data.visibility,
      start_date: parsed.data.startDate ?? null,
      end_date: parsed.data.endDate ?? null,
      budget: parsed.data.budget ?? null,
      budget_currency: parsed.data.budgetCurrency ?? 'VND',
    })
    .select('id')
    .single();

  if (tripError || !trip) {
    slog('trips', 'createTrip failed', { userId: user.id, error: tripError?.message });
    return { ok: false, error: 'Failed to create trip' };
  }

  slog('trips', 'created', { userId: user.id, tripId: trip.id, title: parsed.data.title });

  // Add the creator as an accepted owner member.
  const { error: memberError } = await admin.from('trip_members').insert({
    trip_id: trip.id,
    user_id: user.id,
    role: 'owner',
    invite_status: 'accepted',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    slog('trips', 'trip_members insert failed', { tripId: trip.id, error: memberError.message });
  }

  await logActivity({
    tripId: trip.id,
    userId: user.id,
    action: 'trip.create',
    meta: { title: parsed.data.title },
  });

  revalidatePath('/dashboard');

  return { ok: true, data: { tripId: trip.id } };
}

// -------------------------------------------------------
// updateTripDates
// -------------------------------------------------------

export async function updateTripDates(
  tripId: string,
  startDate: string | null,
  endDate: string | null
): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: memberData } = await admin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const { error } = await admin
    .from('trips')
    .update({ start_date: startDate, end_date: endDate })
    .eq('id', tripId);

  if (error) {
    console.error('updateTripDates error:', error);
    return { ok: false, error: 'Failed to update trip dates' };
  }

  await logActivity({
    tripId,
    userId: user.id,
    action: 'trip.date_update',
    meta: { startDate, endDate },
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/dashboard');
  return { ok: true, data: { tripId } };
}

// -------------------------------------------------------
// updateTrip
// -------------------------------------------------------

export async function updateTrip(
  tripId: string,
  fields: { cover_image_url?: string | null; title?: string; description?: string | null }
): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  // Verify role
  const { data: memberData } = await admin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const updatePayload: Record<string, unknown> = {};
  if ('cover_image_url' in fields) updatePayload.cover_image_url = fields.cover_image_url;
  if ('title' in fields && fields.title !== undefined) updatePayload.title = fields.title;
  if ('description' in fields) updatePayload.description = fields.description;

  const { error } = await admin
    .from('trips')
    .update(updatePayload)
    .eq('id', tripId);

  if (error) {
    console.error('updateTrip error:', error);
    return { ok: false, error: 'Failed to update trip' };
  }

  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/dashboard');

  return { ok: true, data: { tripId } };
}

// -------------------------------------------------------
// updateTripBudget
// -------------------------------------------------------

export async function updateTripBudget(
  tripId: string,
  budget: number | null,
  budgetCurrency: string,
  payerUserId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  const { data: memberData } = await admin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const { error } = await admin
    .from('trips')
    .update({ budget, budget_currency: budgetCurrency, budget_payer_user_id: payerUserId })
    .eq('id', tripId);

  if (error) {
    console.error('updateTripBudget error:', error);
    return { ok: false, error: 'Failed to update budget' };
  }

  revalidatePath(`/trips/${tripId}`);

  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// archiveTrip
// -------------------------------------------------------

export async function archiveTrip(
  tripId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  // Verify the user is the owner before archiving.
  const admin = createAdminClient();
  const { data: memberData } = await admin
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || member.role !== 'owner') {
    return { ok: false, error: 'Only the trip owner can archive a trip' };
  }

  const { error } = await admin
    .from('trips')
    .update({ status: 'archived' })
    .eq('id', tripId);

  if (error) {
    console.error('archiveTrip error:', error);
    return { ok: false, error: 'Failed to archive trip' };
  }

  revalidatePath('/dashboard');
  revalidatePath(`/trips/${tripId}`);

  return { ok: true, data: undefined };
}
