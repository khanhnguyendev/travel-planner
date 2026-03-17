import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
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
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return { title: project ? `Expenses — ${project.title}` : 'Expenses' };
}

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireSession();

  const [project, role, expenses, expensesWithSplits, members] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getExpenses(projectId),
    getExpensesWithSplits(projectId),
    getMembers(projectId),
  ]);

  if (!project || !role) {
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
      href={`/projects/${projectId}/expenses/new`}
      className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
    >
      <Plus className="w-4 h-4" />
      Add expense
    </Link>
  ) : null;

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Expenses"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: project.title, href: `/projects/${projectId}` },
          { label: 'Expenses' },
        ]}
        action={addExpenseButton}
      />

      {/* Summary row */}
      {totalEntries.length > 0 && (
        <p className="text-sm mb-6 -mt-4" style={{ color: 'var(--color-text-muted)' }}>
          {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} &middot;{' '}
          {totalEntries
            .map(([cur, amt]) => formatCurrency(amt, cur))
            .join(' + ')}
        </p>
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
      <ExpenseList expenses={expenses} projectId={projectId} canEdit={canEdit} />
    </div>
  );
}
