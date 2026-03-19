import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { TripSettingsForm } from '@/components/trips/trip-settings-form';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  return { title: trip ? `Settings — ${trip.title}` : 'Settings' };
}

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireSession();

  const [trip, role] = await Promise.all([getTrip(tripId), getUserRole(tripId)]);

  if (!trip || !role) notFound();

  const canManage = ['owner', 'admin'].includes(role);
  if (!canManage) redirect(`/trips/${tripId}`);

  // Check if expenses or contributions exist in the current budget currency.
  // If they do, we disable currency changes to avoid data disappearing.
  const admin = createAdminClient();
  const currency = trip.budget_currency || 'VND';
  const [{ count: expenseCount }, { count: contribCount }] = await Promise.all([
    admin
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('currency', currency),
    admin
      .from('budget_contributions')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('currency', currency),
  ]);
  const hasCurrencyData = (expenseCount ?? 0) > 0 || (contribCount ?? 0) > 0;

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Trip settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: trip.title, href: `/trips/${tripId}` },
          { label: 'Settings' },
        ]}
        action={
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-1.5 btn-secondary text-sm min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to trip
          </Link>
        }
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-2">
          <Settings className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
            Changes are saved per section.
          </p>
        </div>
        <TripSettingsForm trip={trip} isOwner={role === 'owner'} hasCurrencyData={hasCurrencyData} />
      </div>
    </div>
  );
}
