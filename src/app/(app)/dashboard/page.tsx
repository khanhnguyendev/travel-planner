import Link from 'next/link';
import { Plus, Compass, Calendar, Users } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProjects } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { formatDateRange } from '@/lib/date';
import { PageHeader } from '@/components/ui/page-header';
import type { Project } from '@/lib/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

function StatusBadge({ status }: { status: Project['status'] }) {
  const isArchived = status === 'archived';
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
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
  const hasCover = !!project.cover_image_url;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card card-hover block group transition-all hover:scale-[1.02] hover:shadow-md overflow-hidden"
    >
      {/* Cover image or plain header */}
      {hasCover ? (
        <div className="relative h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_image_url!}
            alt={`${project.title} cover`}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          {/* Status badge on top of cover */}
          <div className="absolute top-3 right-3">
            <StatusBadge status={project.status} />
          </div>
          {/* Title on cover */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-semibold text-lg truncate text-white">
              {project.title}
            </h3>
          </div>
        </div>
      ) : null}

      <div className={hasCover ? 'p-4' : 'p-6'}>
        {!hasCover && (
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate mb-1 text-stone-800">
                {project.title}
              </h3>
              {project.description && (
                <p className="text-sm line-clamp-2 text-stone-600">
                  {project.description}
                </p>
              )}
            </div>
            <StatusBadge status={project.status} />
          </div>
        )}

        {hasCover && project.description && (
          <p className="text-sm line-clamp-2 text-stone-600 mb-3">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-stone-400">
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
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const projects = await getProjects();

  const newTripButton = (
    <Link
      href="/projects/new"
      className="btn-primary inline-flex items-center gap-2 text-sm min-h-[44px]"
    >
      <Plus className="w-4 h-4" />
      New trip
    </Link>
  );

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="My Trips"
        breadcrumbs={[{ label: 'Dashboard' }]}
        action={newTripButton}
      />

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div
          className="card flex flex-col items-center justify-center py-20 text-center"
          style={{ borderStyle: 'dashed' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
          >
            <Compass className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2 text-stone-800">
            Start planning your first trip
          </h2>
          <p className="text-sm mb-6 max-w-xs text-stone-600">
            Collect places, vote on destinations, and track shared expenses — all in one collaborative workspace.
          </p>
          <Link
            href="/projects/new"
            className="btn-primary inline-flex items-center gap-2 text-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            New trip
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
