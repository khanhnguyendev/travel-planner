import { notFound } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getExpense } from '@/features/expenses/queries';
import { getPlaces } from '@/features/places/queries';
import { ExpenseDetail } from '@/components/expenses/expense-detail';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string; expenseId: string }>;
}): Promise<Metadata> {
  const { expenseId } = await params;
  const expense = await getExpense(expenseId);
  return { title: expense?.title ?? 'Expense' };
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; expenseId: string }>;
}) {
  const { tripId, expenseId } = await params;
  const user = await requireSession();

  const [trip, role, expense, places] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getExpense(expenseId),
    getPlaces(tripId),
  ]);

  if (!trip || !role || !expense || expense.trip_id !== tripId) {
    notFound();
  }

  return (
    <ExpenseDetail
      expense={expense}
      tripId={tripId}
      tripTitle={trip.title}
      linkedPlaceName={expense.place_id ? places.find((place) => place.id === expense.place_id)?.name ?? null : null}
      currentUserId={user.id}
      role={role}
    />
  );
}
