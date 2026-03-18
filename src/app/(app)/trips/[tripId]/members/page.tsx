import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
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
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await getTrip(tripId);
  return {
    title: trip ? `Thành viên — ` : 'Thành viên',
  };
}

// -------------------------------------------------------
// Page
// -------------------------------------------------------

export default async function MembersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireSession();

  const [trip, role, members, pendingInvites] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getPendingInvites(tripId),
  ]);

  if (!trip || !role) {
    notFound();
  }

  const canManage = ['owner', 'admin'].includes(role);

  return (
    <div className="animate-in fade-in duration-300">
      <PageHeader
        title="Members"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: trip.title, href: `/trips/${tripId}` },
          { label: 'Members' },
        ]}
        action={
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-1.5 btn-secondary text-sm min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to trip
          </Link>
        }
      />

      <div className="space-y-10">
        {/* Invite form — owner/admin only */}
        {canManage && (
          <div className="card-premium p-8 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 shadow-sm flex items-center justify-center transition-transform group-hover:-rotate-3">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-foreground tracking-tight">
                  Expand the Team
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">Invite Collaborators</p>
              </div>
            </div>
            <InviteForm tripId={tripId} />
          </div>
        )}

        {/* Pending invites */}
        {canManage && (
          <div className="card-premium p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display font-bold text-xl text-foreground tracking-tight flex items-center gap-3">
                Pending Invitations
                {pendingInvites.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/10 animate-pulse">
                    {pendingInvites.length}
                  </span>
                )}
              </h2>
            </div>
            <PendingInvitesList
              tripId={tripId}
              invites={pendingInvites}
              canManage={canManage}
            />
          </div>
        )}

        {/* Member list */}
        <div className="card-premium p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-xl text-foreground tracking-tight flex items-center gap-3">
              Active Members
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">
                {members.length}
              </span>
            </h2>
          </div>
          <MemberList
            tripId={tripId}
            members={members}
            currentUserId={user.id}
            currentUserRole={role}
          />
        </div>
      </div>
    </div>
  );
}
