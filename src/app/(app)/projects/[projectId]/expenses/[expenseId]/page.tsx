import { notFound } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getExpense } from '@/features/expenses/queries';
import { ExpenseDetail } from '@/components/expenses/expense-detail';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; expenseId: string }>;
}): Promise<Metadata> {
  const { expenseId } = await params;
  const expense = await getExpense(expenseId);
  return { title: expense?.title ?? 'Expense' };
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; expenseId: string }>;
}) {
  const { projectId, expenseId } = await params;
  await requireSession();

  const [project, role, expense] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getExpense(expenseId),
  ]);

  if (!project || !role || !expense || expense.project_id !== projectId) {
    notFound();
  }

  return (
    <ExpenseDetail expense={expense} projectId={projectId} />
  );
}
