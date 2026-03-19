import { createAdminClient } from '@/lib/supabase/admin';
import type { TransportBooking } from '@/lib/types';

export async function getTransportBookings(tripId: string): Promise<TransportBooking[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data } = await admin
    .from('transport_bookings')
    .select('*')
    .eq('trip_id', tripId)
    .order('departure_date', { ascending: true, nullsFirst: false })
    .order('departure_time', { ascending: true, nullsFirst: false });
  return (data ?? []) as TransportBooking[];
}
