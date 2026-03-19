'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEditor } from '@/lib/membership';
import { logActivity } from '@/lib/activity';
import type { ActionResult } from '@/features/auth/actions';
import type { TransportType } from '@/lib/types';

export interface AddTransportInput {
  tripId: string;
  transport_type: TransportType;
  provider?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  cost?: number | null;
  currency?: string;
  reference_code?: string | null;
  note?: string | null;
}

export async function addTransportBooking(
  input: AddTransportInput
): Promise<ActionResult<{ bookingId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const role = await requireEditor(input.tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const admin = createAdminClient();
  const currency = input.currency ?? 'VND';
  let expenseId: string | null = null;

  // Auto-create expense entry if cost provided
  if (input.cost && input.cost > 0) {
    const label = [
      input.transport_type === 'rent' ? 'Car rental' : input.transport_type === 'bus' ? 'Bus' : 'Flight',
      input.provider ? `– ${input.provider}` : null,
      input.from_location && input.to_location ? `(${input.from_location} → ${input.to_location})` : null,
    ].filter(Boolean).join(' ');

    const { data: expenseRow, error: expenseError } = await admin
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        paid_by_user_id: user.id,
        paid_from_pool: false,
        title: label,
        amount: input.cost,
        currency,
        expense_date: input.departure_date ?? null,
        note: input.note ?? null,
        category: 'transport',
        place_id: null,
        receipt_path: null,
      })
      .select('id')
      .single();

    if (expenseError || !expenseRow) {
      return { ok: false, error: 'Failed to create expense entry' };
    }

    expenseId = (expenseRow as { id: string }).id;

    // Insert a single split for the creator (full amount) as a starting point
    await admin.from('expense_splits').insert({
      expense_id: expenseId,
      trip_id: input.tripId,
      user_id: user.id,
      amount_owed: input.cost,
      status: 'pending',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking, error } = await (admin as any)
    .from('transport_bookings')
    .insert({
      trip_id: input.tripId,
      created_by: user.id,
      transport_type: input.transport_type,
      provider: input.provider ?? null,
      from_location: input.from_location ?? null,
      to_location: input.to_location ?? null,
      departure_date: input.departure_date ?? null,
      departure_time: input.departure_time ?? null,
      arrival_date: input.arrival_date ?? null,
      arrival_time: input.arrival_time ?? null,
      cost: input.cost ?? null,
      currency,
      reference_code: input.reference_code ?? null,
      note: input.note ?? null,
      expense_id: expenseId,
    })
    .select('id')
    .single();

  if (error || !booking) {
    return { ok: false, error: 'Failed to save transport booking' };
  }

  await logActivity({
    tripId: input.tripId,
    userId: user.id,
    action: 'transport.add',
    entityType: 'transport_booking',
    entityId: (booking as { id: string }).id,
    meta: { transport_type: input.transport_type, provider: input.provider },
  });

  return { ok: true, data: { bookingId: (booking as { id: string }).id } };
}

export async function deleteTransportBooking(
  bookingId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking } = await (admin as any)
    .from('transport_bookings')
    .select('trip_id, expense_id')
    .eq('id', bookingId)
    .single();

  if (!booking) return { ok: false, error: 'Booking not found' };

  const tripId = (booking as { trip_id: string; expense_id: string | null }).trip_id;
  const linkedExpenseId = (booking as { trip_id: string; expense_id: string | null }).expense_id;

  const role = await requireEditor(tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  // Delete booking first (expense FK is set null on delete)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('transport_bookings')
    .delete()
    .eq('id', bookingId);

  if (error) return { ok: false, error: 'Failed to delete booking' };

  // Clean up linked expense if exists
  if (linkedExpenseId) {
    await admin.from('expense_splits').delete().eq('expense_id', linkedExpenseId);
    await admin.from('expenses').delete().eq('id', linkedExpenseId);
  }

  await logActivity({
    tripId,
    userId: user.id,
    action: 'transport.delete',
    entityType: 'transport_booking',
    entityId: bookingId,
  });

  return { ok: true, data: undefined };
}
