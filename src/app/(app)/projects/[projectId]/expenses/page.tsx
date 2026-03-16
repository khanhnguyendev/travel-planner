import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getExpenses } from '@/features/expenses/queries';
import { ExpenseList } from '@/components/expenses/expense-list';
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
  await requireSession();

  const [project, role, expenses] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getExpenses(projectId),
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

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {project.title}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Expenses
          </h1>
          {totalEntries.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} &middot;{' '}
              {totalEntries
                .map(([cur, amt]) => formatCurrency(amt, cur))
                .join(' + ')}
            </p>
          )}
        </div>

        {canEdit && (
          <Link
            href={`/projects/${projectId}/expenses/new`}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add expense
          </Link>
        )}
      </div>

      {/* List */}
      <ExpenseList expenses={expenses} projectId={projectId} />
    </div>
  );
}
