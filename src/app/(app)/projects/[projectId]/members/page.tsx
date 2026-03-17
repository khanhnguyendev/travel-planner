import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getProject, getUserRole } from '@/features/projects/queries';
import { getMembers, getPendingInvites } from '@/features/members/queries';
import { PageHeader } from '@/components/ui/page-header';
import { MemberList } from '@/components/members/member-list';
import { InviteForm } from '@/components/members/invite-form';
import { PendingInvitesList } from '@/components/members/pending-invites-list';
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
    title: project ? `Members — ${project.title}` : 'Members',
  };
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function MembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireSession();

  const [project, role, members, pendingInvites] = await Promise.all([
    getProject(projectId),
    getUserRole(projectId),
    getMembers(projectId),
    getPendingInvites(projectId),
  ]);

  if (!project || !role) {
    notFound();
  }

  const canManage = ['owner', 'admin'].includes(role);

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Members"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: project.title, href: `/projects/${projectId}` },
          { label: 'Members' },
        ]}
        action={
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 btn-secondary text-sm min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to trip
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Invite form — owner/admin only */}
        {canManage && (
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              </div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                Invite someone
              </h2>
            </div>
            <InviteForm projectId={projectId} />
          </div>
        )}

        {/* Pending invites */}
        {canManage && (
          <div className="card p-6">
            <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>
              Pending invites
              {pendingInvites.length > 0 && (
                <span
                  className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600"
                >
                  {pendingInvites.length}
                </span>
              )}
            </h2>
            <PendingInvitesList
              projectId={projectId}
              invites={pendingInvites}
              canManage={canManage}
            />
          </div>
        )}

        {/* Member list */}
        <div className="card p-6">
          <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>
            Members
            <span
              className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600"
            >
              {members.length}
            </span>
          </h2>
          <MemberList
            projectId={projectId}
            members={members}
            currentUserId={user.id}
            currentUserRole={role}
          />
        </div>
      </div>
    </div>
  );
}
