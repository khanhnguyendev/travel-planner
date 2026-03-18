import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getExpenses, getExpensesWithSplits } from '@/features/expenses/queries';
import { getMembers } from '@/features/members/queries';
import { ExpenseList } from '@/components/expenses/expense-list';
import { DebtSummary } from '@/components/expenses/debt-summary';
import { PageHeader } from '@/components/ui/page-header';
import { formatCurrency } from '@/lib/format';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  return { title: trip ? `Chi tiêu — ` : 'Chi tiêu' };
}

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireSession();

  const [trip, role, expenses, expensesWithSplits, members] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getExpenses(tripId),
    getExpensesWithSplits(tripId),
    getMembers(tripId),
  ]);

  if (!trip || !role) {
    notFound();
  }

  const canEdit = ['owner', 'admin', 'editor'].includes(role);

  // Compute totals per currency
  const totals: Record<string, number> = {};
  for (const exp of expenses) {
    totals[exp.currency] = (totals[exp.currency] ?? 0) + exp.amount;
  }
  const totalEntries = Object.entries(totals);

  // Build members list in the format DebtSummary expects
  const memberProfiles = members.map((m) => ({
    id: m.profile.id,
    display_name: m.profile.display_name,
    avatar_url: m.profile.avatar_url,
    user_id: m.user_id,
  }));

  const addExpenseButton = canEdit ? (
    <Link
      href={`/trips/${tripId}/expenses/new`}
      className="btn-premium inline-flex items-center gap-2 text-[11px] h-11 px-6 rounded-2xl font-display font-bold uppercase tracking-widest shadow-premium active:scale-95"
    >
      <Plus className="w-4 h-4" />
      Add Expense
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in duration-500">
      <PageHeader
        title="Trip Ledger"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: trip.title, href: `/trips/${tripId}` },
          { label: 'Expenses' },
        ]}
        action={addExpenseButton}
      />

      {/* Summary row */}
      {totalEntries.length > 0 && (
        <div className="flex items-center gap-3 mb-8 -mt-4 animate-in slide-in-from-left-4 duration-700">
          <div className="px-4 py-2 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest">
               {expenses.length} {expenses.length === 1 ? 'Record' : 'Records'} Detected
             </span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-slate-50 text-slate-500 border border-slate-100 shadow-sm">
             <span className="text-[10px] font-black uppercase tracking-widest">
               Total: {totalEntries.map(([cur, amt]) => formatCurrency(amt, cur)).join(' + ')}
             </span>
          </div>
        </div>
      )}

      {/* Debt summary */}
      {expensesWithSplits.length > 0 && (
        <DebtSummary
          expenses={expensesWithSplits}
          members={memberProfiles}
          currentUserId={user.id}
        />
      )}

      {/* List */}
      <ExpenseList expenses={expenses} tripId={tripId} canEdit={canEdit} />
    </div>
  );
}
