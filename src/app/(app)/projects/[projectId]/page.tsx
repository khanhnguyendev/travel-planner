import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Receipt,
  Globe,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { PlacesSection } from '@/components/places/places-section';
import type { ProjectRole, Visibility, PlaceVote, PlaceReview } from '@/lib/types';
import type { Metadata } from 'next';

// -------------------------------------------------------
// Metadata
// -------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProject(projectId);
  return {
    title: project?.title ?? 'Trip',
  };
}

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function RoleBadge({ role }: { role: ProjectRole }) {
  const styles: Record<ProjectRole, { bg: string; text: string }> = {
    owner: { bg: '#FEF3C7', text: '#92400E' },
    admin: { bg: '#EDE9FE', text: '#5B21B6' },
    editor: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
    viewer: { bg: 'var(--color-bg-muted)', text: 'var(--color-text-muted)' },
  };
  const s = styles[role];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {role}
    </span>
  );
}

function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const isShared = visibility === 'shared';
  return (
    <span
      className="inline-flex items-center gap-1 text-xs"
      style={{ color: 'var(--color-text-subtle)' }}
    >
      {isShared ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
      {isShared ? 'Shared' : 'Private'}
    </span>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireSession();

  const [project, role, members, categories] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getMembers(projectId),
    getCategories(projectId),
  ]);

  if (!project || !role) {
    notFound();
  }

  // Fetch places and votes in parallel
  const places = await getPlaces(projectId);

  const [voteSummaries, userVotesRaw, reviewsRaw] = await Promise.all([
    getVoteSummary(projectId),
    // Fetch each user vote individually in parallel
    Promise.all(places.map((p) => getUserVote(p.id, user.id))),
    // Fetch reviews for all places
    (async () => {
      if (places.length === 0) return [];
      const supabase = await createClient();
      const { data } = await supabase
        .from('place_reviews')
        .select('*')
        .in(
          'place_id',
          places.map((p) => p.id)
        );
      return data ?? [];
    })(),
  ]);

  // Build data maps
  const userVotes = userVotesRaw.filter(Boolean) as PlaceVote[];

  const reviewsByPlaceId: Record<string, PlaceReview[]> = {};
  for (const review of reviewsRaw as PlaceReview[]) {
    if (!reviewsByPlaceId[review.place_id]) {
      reviewsByPlaceId[review.place_id] = [];
    }
    reviewsByPlaceId[review.place_id].push(review);
  }

  const isArchived = project.status === 'archived';

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      {/* Project header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1
                className="text-2xl font-bold truncate"
                style={{ color: 'var(--color-text)' }}
              >
                {project.title}
              </h1>
              {isArchived && (
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--color-bg-muted)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Archived
                </span>
              )}
            </div>

            {project.description && (
              <p
                className="text-sm mb-3 leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {project.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 flex-wrap">
              {project.start_date && project.end_date && (
                <span
                  className="inline-flex items-center gap-1.5 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Calendar className="w-4 h-4" />
                  {formatDateRange(project.start_date, project.end_date)}
                </span>
              )}

              <span
                className="inline-flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <Users className="w-4 h-4" />
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>

              <VisibilityBadge visibility={project.visibility} />
            </div>
          </div>

          {/* Role badge */}
          <RoleBadge role={role} />
        </div>
      </div>

      {/* Members strip */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
          Members
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {members.map((m) => {
            const name = m.profile.display_name ?? 'Unknown';
            const isCurrentUser = m.user_id === user.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                  backgroundColor: isCurrentUser
                    ? 'var(--color-primary-light)'
                    : 'var(--color-bg-subtle)',
                  color: isCurrentUser
                    ? 'var(--color-primary)'
                    : 'var(--color-text-muted)',
                }}
                title={`${name} — ${m.role}`}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <span>{name}</span>
                <span className="opacity-60 capitalize">{m.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Places & Voting — Phase 2 */}
      <div className="mb-6">
        <PlacesSection
          projectId={projectId}
          role={role}
          initialPlaces={places}
          initialCategories={categories}
          initialVoteSummaries={voteSummaries}
          initialUserVotes={userVotes}
          reviewsByPlaceId={reviewsByPlaceId}
        />
      </div>

      {/* Expenses placeholder — Phase 3 */}
      <div
        className="card p-6 flex flex-col items-center justify-center text-center py-12"
        style={{ borderStyle: 'dashed' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--color-bg-subtle)' }}
        >
          <Receipt className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
        </div>
        <h3 className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          Expenses
        </h3>
        <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
          Log shared expenses, split them fairly, and upload receipts so everyone knows who owes what.
        </p>
        <span
          className="mt-3 text-xs font-medium px-2 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-bg-muted)',
            color: 'var(--color-text-subtle)',
          }}
        >
          Coming in Phase 3
        </span>
      </div>
    </div>
  );
}
