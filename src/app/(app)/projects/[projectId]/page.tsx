import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Receipt,
  Globe,
  Lock,
  Plus,
} from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpenses } from '@/features/expenses/queries';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { PlacesSection } from '@/components/places/places-section';
import { PageHeader } from '@/components/ui/page-header';
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

  const [project, role, members, categories, expenses] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getMembers(projectId),
    getCategories(projectId),
    getExpenses(projectId),
  ]);

  if (!project || !role) {
    notFound();
  }

  // Fetch places and votes in parallel
  const places = await getPlaces(projectId);

  const [voteSummaries, userVotesRaw, reviewsRaw] = await Promise.all([
    getVoteSummary(projectId),
    Promise.all(places.map((p) => getUserVote(p.id, user.id))),
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
  const canEdit = ['owner', 'admin', 'editor'].includes(role);

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title={project.title}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: project.title }]}
        action={
          isArchived ? null : canEdit ? (
            <Link
              href={`/projects/${projectId}/expenses/new`}
              className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add expense
            </Link>
          ) : null
        }
      />

      {/* Project meta card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs min-h-[36px]"
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

      {/* Places & Voting */}
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

      {/* Expenses */}
      {(() => {
        const totals: Record<string, number> = {};
        for (const exp of expenses) {
          totals[exp.currency] = (totals[exp.currency] ?? 0) + exp.amount;
        }
        const totalEntries = Object.entries(totals);

        return (
          <div className="card p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary-light)' }}
                >
                  <Receipt className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h2 className="font-semibold text-base text-stone-800">
                    Expenses
                  </h2>
                  {expenses.length > 0 && (
                    <p className="text-xs text-stone-400">
                      {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
                      {totalEntries.length > 0 && (
                        <> &middot; {totalEntries.map(([cur, amt]) => formatCurrency(amt, cur)).join(' + ')}</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <Link
                    href={`/projects/${projectId}/expenses/new`}
                    className="inline-flex items-center gap-1.5 btn-primary text-sm min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Link>
                )}
                <Link
                  href={`/projects/${projectId}/expenses`}
                  className="btn-secondary text-sm min-h-[44px]"
                >
                  View all
                </Link>
              </div>
            </div>

            {expenses.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: 'var(--color-bg-subtle)' }}
                >
                  <Receipt className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
                </div>
                <p className="font-medium text-sm text-stone-800 mb-1">
                  Track your first shared expense
                </p>
                <p className="text-xs text-stone-400 max-w-xs">
                  Add expenses to keep everyone on the same page about shared costs.
                </p>
                {canEdit && (
                  <Link
                    href={`/projects/${projectId}/expenses/new`}
                    className="mt-4 btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    Add expense
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 3).map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/projects/${projectId}/expenses/${exp.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--color-bg-subtle)] min-h-[44px]"
                  >
                    <span className="text-sm truncate text-stone-800">
                      {exp.title}
                    </span>
                    <span className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--color-primary)' }}>
                      {formatCurrency(exp.amount, exp.currency)}
                    </span>
                  </Link>
                ))}
                {expenses.length > 3 && (
                  <p className="text-xs pt-1 pl-3 text-stone-400">
                    +{expenses.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
