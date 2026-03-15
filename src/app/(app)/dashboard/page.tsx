import Link from 'next/link';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProjects } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { formatDateRange } from '@/lib/date';
import type { Project } from '@/lib/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

function StatusBadge({ status }: { status: Project['status'] }) {
  const isArchived = status === 'archived';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isArchived ? 'var(--color-bg-muted)' : 'var(--color-primary-light)',
        color: isArchived ? 'var(--color-text-muted)' : 'var(--color-primary)',
      }}
    >
      {isArchived ? 'Archived' : 'Active'}
    </span>
  );
}

async function ProjectCard({ project }: { project: Project }) {
  const members = await getMembers(project.id);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card card-hover block p-6 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-lg truncate mb-1"
            style={{ color: 'var(--color-text)' }}
          >
            {project.title}
          </h3>
          {project.description && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {project.description}
            </p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
        {project.start_date && project.end_date && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateRange(project.start_date, project.end_date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const projects = await getProjects();

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            My Trips
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {projects.length === 0
              ? 'Create your first trip to get started'
              : `${projects.length} trip${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <Link
          href="/projects/new"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New trip
        </Link>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div
          className="card flex flex-col items-center justify-center py-20 text-center"
          style={{ borderStyle: 'dashed' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <MapPin className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            No trips yet
          </h2>
          <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            Create a new trip to start collecting places, voting, and planning with your group.
          </p>
          <Link
            href="/projects/new"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create your first trip
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
