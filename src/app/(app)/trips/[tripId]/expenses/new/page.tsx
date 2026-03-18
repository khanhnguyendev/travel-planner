import { notFound } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { getPlaces } from '@/features/places/queries';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thêm chi tiêu' };

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireSession();

  const [trip, role, members, places] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getPlaces(tripId),
  ]);

  if (!trip || !role) {
    notFound();
  }

  // Only owner/admin/editor can add expenses
  if (!['owner', 'admin', 'editor'].includes(role)) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title="Add Expense"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: trip.title, href: `/trips/${tripId}` },
          { label: 'Expenses', href: `/trips/${tripId}/expenses` },
          { label: 'Add Expense' },
        ]}
      />

      <div className="card p-6 max-w-xl">
        <ExpenseForm
          tripId={tripId}
          members={members}
          currentUserId={user.id}
          places={places}
        />
      </div>
    </div>
  );
}
