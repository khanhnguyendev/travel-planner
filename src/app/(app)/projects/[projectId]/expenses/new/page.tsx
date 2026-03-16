import { notFound } from 'next/navigation';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Add Expense' };

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireSession();

  const [project, role, members] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getMembers(projectId),
  ]);

  if (!project || !role) {
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
          { label: project.title, href: `/projects/${projectId}` },
          { label: 'Expenses', href: `/projects/${projectId}/expenses` },
          { label: 'Add Expense' },
        ]}
      />

      <div className="card p-6 max-w-xl">
        <ExpenseForm
          projectId={projectId}
          members={members}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
