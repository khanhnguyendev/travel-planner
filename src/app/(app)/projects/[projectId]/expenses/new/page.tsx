import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { ExpenseForm } from '@/components/expenses/expense-form';
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
      {/* Back link */}
      <Link
        href={`/projects/${projectId}/expenses`}
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to expenses
      </Link>

      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>
        Add Expense
      </h1>

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
