import { notFound } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getExpense } from '@/features/expenses/queries';
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

  const [trip, role, expense] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getExpense(expenseId),
  ]);

  if (!trip || !role || !expense || expense.trip_id !== tripId) {
    notFound();
  }

  return (
    <ExpenseDetail
      expense={expense}
      tripId={tripId}
      tripTitle={trip.title}
      currentUserId={user.id}
      role={role}
    />
  );
}
