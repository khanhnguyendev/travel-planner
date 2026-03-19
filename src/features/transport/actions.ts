'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEditor } from '@/lib/membership';
import { logActivity } from '@/lib/activity';
import type { ActionResult } from '@/features/auth/actions';
import type { TransportType } from '@/lib/types';

export interface TransportBookingInput {
  transport_type: TransportType;
  provider?: string | null;
  from_location?: string | null;
  to_location?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  reference_code?: string | null;
  note?: string | null;
}

export async function addTransportBooking(
  tripId: string,
  input: TransportBookingInput
): Promise<ActionResult<{ bookingId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const role = await requireEditor(tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: booking, error } = await (admin as any)
    .from('transport_bookings')
    .insert({
      trip_id: tripId,
      created_by: user.id,
      transport_type: input.transport_type,
      provider: input.provider ?? null,
      from_location: input.from_location ?? null,
      to_location: input.to_location ?? null,
      departure_date: input.departure_date ?? null,
      departure_time: input.departure_time ?? null,
      arrival_date: input.arrival_date ?? null,
      arrival_time: input.arrival_time ?? null,
      reference_code: input.reference_code ?? null,
      note: input.note ?? null,
    })
    .select('id')
    .single();

  if (error || !booking) return { ok: false, error: 'Failed to save transport booking' };

  await logActivity({
    tripId,
    userId: user.id,
    action: 'transport.add',
    entityType: 'transport_booking',
    entityId: (booking as { id: string }).id,
    meta: { transport_type: input.transport_type, provider: input.provider },
  });

  return { ok: true, data: { bookingId: (booking as { id: string }).id } };
}

export async function updateTransportBooking(
  bookingId: string,
  input: TransportBookingInput
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from('transport_bookings')
    .select('trip_id')
    .eq('id', bookingId)
    .single();

  if (!existing) return { ok: false, error: 'Booking not found' };

  const tripId = (existing as { trip_id: string }).trip_id;
  const role = await requireEditor(tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('transport_bookings')
    .update({
      transport_type: input.transport_type,
      provider: input.provider ?? null,
      from_location: input.from_location ?? null,
      to_location: input.to_location ?? null,
      departure_date: input.departure_date ?? null,
      departure_time: input.departure_time ?? null,
      arrival_date: input.arrival_date ?? null,
      arrival_time: input.arrival_time ?? null,
      reference_code: input.reference_code ?? null,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (error) return { ok: false, error: 'Failed to update booking' };

  return { ok: true, data: undefined };
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
    .select('trip_id')
    .eq('id', bookingId)
    .single();

  if (!booking) return { ok: false, error: 'Booking not found' };

  const tripId = (booking as { trip_id: string }).trip_id;
  const role = await requireEditor(tripId, user.id);
  if (!role) return { ok: false, error: 'Insufficient permissions' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('transport_bookings')
    .delete()
    .eq('id', bookingId);

  if (error) return { ok: false, error: 'Failed to delete booking' };

  await logActivity({
    tripId,
    userId: user.id,
    action: 'transport.delete',
    entityType: 'transport_booking',
    entityId: bookingId,
  });

  return { ok: true, data: undefined };
}
