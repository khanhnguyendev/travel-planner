import { requireSession } from '@/features/auth/session';
import ProjectCreateForm from './trip-create-form';
import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Trip',
};

export default async function NewProjectPage() {
  await requireSession();

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Create a new trip"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'New Trip' },
        ]}
      />

      <div className="card p-8">
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Give your trip a name and invite your crew when you&apos;re ready.
        </p>
        <ProjectCreateForm />
      </div>
    </div>
  );
}
