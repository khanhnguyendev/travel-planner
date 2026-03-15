import { requireSession } from '@/features/auth/session';
import ProjectCreateForm from './project-create-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New Trip',
};

export default async function NewProjectPage() {
  await requireSession();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
          Create a new trip
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Give your trip a name and invite your crew when you&apos;re ready.
        </p>
      </div>

      {/* Form card */}
      <div className="card p-8">
        <ProjectCreateForm />
      </div>
    </div>
  );
}
