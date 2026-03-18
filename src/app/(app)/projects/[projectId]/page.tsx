import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Receipt,
  Globe,
  Lock,
  UserCog,
  Crown,
  ShieldCheck,
  Pencil,
  Eye,
} from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers } from '@/features/members/queries';
import { getCategories } from '@/features/categories/queries';
import { getPlaces, getCommentsByProjectId } from '@/features/places/queries';
import { getVoteSummary, getUserVote } from '@/features/votes/queries';
import { getExpenses, getExpensesWithSplits } from '@/features/expenses/queries';
import { createClient } from '@/lib/supabase/server';
import { formatDateRange } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { PlacesSection } from '@/components/places/places-section';
import { TripTimeline } from '@/components/places/trip-timeline';
import { MapTabClient } from '@/components/places/map-tab-client';
import { DebtSummary } from '@/components/expenses/debt-summary';
import { PageHeader } from '@/components/ui/page-header';
import { Avatar } from '@/components/ui/avatar';
import { CoverImageUpload } from '@/components/projects/cover-image-upload';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { AddExpenseDialog } from '@/components/expenses/add-expense-dialog';
import type { ProjectRole, Visibility, PlaceVote, PlaceReview, PlaceComment } from '@/lib/types';
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

type TabValue = 'places' | 'timeline' | 'map' | 'expenses';

function TabBar({
  activeTab,
  projectId,
}: {
  activeTab: TabValue;
  projectId: string;
}) {
  const tabs: { label: string; value: TabValue }[] = [
    { label: 'Places', value: 'places' },
    { label: 'Timeline', value: 'timeline' },
    { label: 'Map', value: 'map' },
    { label: 'Expenses', value: 'expenses' },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-2xl mb-6"
      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Link
            key={tab.value}
            href={`/projects/${projectId}?tab=${tab.value}`}
            className="flex-1 text-center px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] flex items-center justify-center"
            style={{
              backgroundColor: isActive ? 'white' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab: tabParam } = await searchParams;
  const user = await requireSession();

  const validTabs: TabValue[] = ['places', 'timeline', 'map', 'expenses'];
  const activeTab: TabValue =
    tabParam && validTabs.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : 'places';

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

  // Fetch places (needed for Places + Timeline + Map tabs)
  const places = await getPlaces(projectId);

  const [voteSummaries, userVotesRaw, reviewsRaw, commentsRaw, expensesWithSplits] =
    await Promise.all([
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
      getCommentsByProjectId(projectId),
      getExpensesWithSplits(projectId),
    ]);

  const userVotes = userVotesRaw.filter(Boolean) as PlaceVote[];

  const reviewsByPlaceId: Record<string, PlaceReview[]> = {};
  for (const review of reviewsRaw as PlaceReview[]) {
    if (!reviewsByPlaceId[review.place_id]) {
      reviewsByPlaceId[review.place_id] = [];
    }
    reviewsByPlaceId[review.place_id].push(review);
  }

  const commentsByPlaceId: Record<string, PlaceComment[]> = {};
  for (const comment of commentsRaw) {
    if (!commentsByPlaceId[comment.place_id]) {
      commentsByPlaceId[comment.place_id] = [];
    }
    commentsByPlaceId[comment.place_id].push(comment);
  }

  const commentAuthors: Record<string, string> = {};
  for (const m of members) {
    commentAuthors[m.user_id] = m.profile.display_name ?? 'Member';
  }

  const isArchived = project.status === 'archived';
  const canEdit = ['owner', 'admin', 'editor'].includes(role);
  const canManage = ['owner', 'admin'].includes(role);

  const memberProfiles = members.map((m) => ({
    id: m.profile.id,
    display_name: m.profile.display_name,
    avatar_url: m.profile.avatar_url,
    user_id: m.user_id,
  }));

  return (
    <div className="animate-in fade-in duration-300">
      {/* Cover image strip */}
      {canManage ? (
        <div className="mb-6 rounded-2xl overflow-hidden">
          <CoverImageUpload projectId={projectId} currentCoverUrl={project.cover_image_url} />
        </div>
      ) : project.cover_image_url ? (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ height: 200 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_image_url}
            alt={`${project.title} cover`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}

      <PageHeader
        title={project.title}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: project.title }]}
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

          <RoleBadge role={role} />
        </div>
      </div>

      {/* Members strip */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Members
          </h2>
          <div className="flex items-center gap-2">
            {canManage && (
              <InviteLinkButton projectId={projectId} />
            )}
            <Link
              href={`/projects/${projectId}/members`}
              className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-teal-600 min-h-[36px] px-2"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              <UserCog className="w-3.5 h-3.5" />
              Manage
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {members.map((m) => {
            const name = m.profile.display_name ?? 'Unknown';
            const isCurrentUser = m.user_id === user.id;
            const roleConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
              owner:  { icon: <Crown className="w-3 h-3" />,       bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
              admin:  { icon: <ShieldCheck className="w-3 h-3" />, bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
              editor: { icon: <Pencil className="w-3 h-3" />,      bg: '#CCFBF1', text: '#0F766E', border: '#5EEAD4' },
              viewer: { icon: <Eye className="w-3 h-3" />,         bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
            };
            const rc = roleConfig[m.role] ?? roleConfig.viewer;
            return (
              <div
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border"
                style={{ backgroundColor: rc.bg, color: rc.text, borderColor: rc.border }}
                title={`${name} — ${m.role}${isCurrentUser ? ' (you)' : ''}`}
              >
                <Avatar user={{ display_name: name, avatar_url: m.profile.avatar_url }} size="sm" />
                <span className="font-medium">{name}{isCurrentUser ? ' (you)' : ''}</span>
                <span className="flex items-center gap-0.5 opacity-75">{rc.icon}{m.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} projectId={projectId} />

      {/* Tab: Places */}
      {activeTab === 'places' && (
        <div className="mb-6">
          <PlacesSection
            projectId={projectId}
            role={role}
            initialPlaces={places}
            initialCategories={categories}
            initialVoteSummaries={voteSummaries}
            initialUserVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={user.id}
          />
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="card p-6 mb-6">
          <TripTimeline places={places} categories={categories} />
        </div>
      )}

      {/* Tab: Map */}
      {activeTab === 'map' && (
        <div className="mb-6">
          <MapTabClient
            projectId={projectId}
            places={places}
            categories={categories}
            voteSummaries={voteSummaries}
            userVotes={userVotes}
            reviewsByPlaceId={reviewsByPlaceId}
            commentsByPlaceId={commentsByPlaceId}
            commentAuthors={commentAuthors}
            currentUserId={user.id}
          />
        </div>
      )}

      {/* Tab: Expenses */}
      {activeTab === 'expenses' && (
        <div className="mb-6">
          {expensesWithSplits.length > 0 && (
            <DebtSummary
              expenses={expensesWithSplits}
              members={memberProfiles}
              currentUserId={user.id}
            />
          )}

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
                      <AddExpenseDialog
                        projectId={projectId}
                        members={members}
                        currentUserId={user.id}
                      />
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
      )}
    </div>
  );
}
