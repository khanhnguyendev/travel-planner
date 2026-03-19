import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { getPlaces } from '@/features/places/queries';
import { getExpense } from '@/features/expenses/queries';
import { getTransportBookings } from '@/features/transport/queries';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Edit Expense' };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ tripId: string; expenseId: string }>;
}) {
  const { tripId, expenseId } = await params;
  const user = await requireSession();

  const [trip, role, members, places, expense, transportBookings] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getPlaces(tripId),
    getExpense(expenseId),
    getTransportBookings(tripId),
  ]);

  if (!trip || !role || !expense || expense.trip_id !== tripId) {
    notFound();
  }

  // Only owner can edit expenses
  if (role !== 'owner') {
    redirect(`/trips/${tripId}/expenses/${expenseId}`);
  }

  return (
    <div>
      <PageHeader
        title="Edit Expense"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: trip.title, href: `/trips/${tripId}` },
          { label: 'Expenses', href: `/trips/${tripId}/expenses` },
          { label: expense.title, href: `/trips/${tripId}/expenses/${expenseId}` },
          { label: 'Edit' },
        ]}
      />

      <div className="card p-6 max-w-xl">
        <ExpenseForm
          tripId={tripId}
          members={members}
          currentUserId={user.id}
          places={places}
          transportBookings={transportBookings}
          expense={expense}
        />
      </div>
    </div>
  );
}
