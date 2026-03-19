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
  fields: {
    cover_image_url?: string | null;
    title?: string;
    description?: string | null;
    visibility?: 'private' | 'public';
    budget_currency?: string;
  }
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
  if ('visibility' in fields) updatePayload.visibility = fields.visibility;
  if ('budget_currency' in fields) updatePayload.budget_currency = fields.budget_currency;

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
// addBudgetContribution
// -------------------------------------------------------

export async function addBudgetContribution(
  tripId: string,
  amount: number,
  currency: string,
  userId: string,
  note?: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  if (!amount || amount <= 0) return { ok: false, error: 'Amount must be positive' };

  const admin = createAdminClient();

  // Verify caller is an accepted member (editor or above can contribute)
  const { data: memberData } = await admin
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  // Validate that userId is an accepted member of the trip and fetch their name
  const { data: targetData } = await admin
    .from('trip_members')
    .select('user_id, profiles(display_name)')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .single();

  if (!targetData) return { ok: false, error: 'Selected user is not a member of this trip' };

  const contributorName =
    (targetData as unknown as { profiles?: { display_name?: string | null } | null })
      ?.profiles?.display_name ?? null;

  // Insert contribution row
  const { error: contribError } = await admin.from('budget_contributions').insert({
    trip_id: tripId,
    user_id: userId,
    amount,
    currency,
    note: note ?? null,
  });

  if (contribError) {
    console.error('addBudgetContribution insert error:', contribError);
    return { ok: false, error: 'Failed to record contribution' };
  }

  void logActivity({
    tripId,
    userId: user.id,
    action: 'budget.contribute',
    meta: { amount, currency, contributorUserId: userId, contributorName, note: note ?? null },
  });

  revalidatePath(`/trips/${tripId}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// deleteContribution
// -------------------------------------------------------

export async function deleteContribution(
  contributionId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // Fetch the contribution to get tripId + details for logging
  const { data: contrib } = await admin
    .from('budget_contributions')
    .select('trip_id, user_id, amount, currency')
    .eq('id', contributionId)
    .single();

  if (!contrib) return { ok: false, error: 'Contribution not found' };

  const c = contrib as { trip_id: string; user_id: string; amount: number; currency: string };

  const [memberData, profileData] = await Promise.all([
    admin
      .from('trip_members')
      .select('role')
      .eq('trip_id', c.trip_id)
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')
      .single()
      .then((r) => r.data),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', c.user_id)
      .single()
      .then((r) => r.data),
  ]);

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const { error } = await admin
    .from('budget_contributions')
    .delete()
    .eq('id', contributionId);

  if (error) {
    console.error('deleteContribution error:', error);
    return { ok: false, error: 'Failed to delete contribution' };
  }

  const contributorName = (profileData as { display_name?: string | null } | null)?.display_name ?? null;
  void logActivity({
    tripId: c.trip_id,
    userId: user.id,
    action: 'budget.remove',
    meta: { amount: c.amount, currency: c.currency, contributorName },
  });

  revalidatePath(`/trips/${c.trip_id}`);
  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// editContribution
// -------------------------------------------------------

export async function editContribution(
  contributionId: string,
  amount: number,
  note?: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!amount || amount <= 0) return { ok: false, error: 'Amount must be positive' };

  const admin = createAdminClient();

  const { data: contrib } = await admin
    .from('budget_contributions')
    .select('trip_id, user_id, amount, currency')
    .eq('id', contributionId)
    .single();

  if (!contrib) return { ok: false, error: 'Contribution not found' };
  const c = contrib as { trip_id: string; user_id: string; amount: number; currency: string };

  const [memberData, profileData] = await Promise.all([
    admin
      .from('trip_members')
      .select('role')
      .eq('trip_id', c.trip_id)
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')
      .single()
      .then((r) => r.data),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', c.user_id)
      .single()
      .then((r) => r.data),
  ]);

  const member = memberData as { role: string } | null;
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return { ok: false, error: 'Insufficient permissions' };
  }

  const { error } = await admin
    .from('budget_contributions')
    .update({ amount, note: note ?? null })
    .eq('id', contributionId);

  if (error) {
    console.error('editContribution error:', error);
    return { ok: false, error: 'Failed to update contribution' };
  }

  const contributorName = (profileData as { display_name?: string | null } | null)?.display_name ?? null;
  void logActivity({
    tripId: c.trip_id,
    userId: user.id,
    action: 'budget.edit',
    meta: { oldAmount: c.amount, amount, currency: c.currency, contributorName, note: note ?? null },
  });

  revalidatePath(`/trips/${c.trip_id}`);
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
