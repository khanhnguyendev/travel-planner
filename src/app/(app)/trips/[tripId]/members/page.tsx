import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrip, getUserRole } from '@/features/trips/queries';
import { getMembers, getPendingInvites, getJoinRequests } from '@/features/members/queries';
import { getExpensesWithSplits } from '@/features/expenses/queries';
import { calculateMemberBalances } from '@/features/expenses/debt';
import { PageHeader } from '@/components/ui/page-header';
import { MemberList } from '@/components/members/member-list';
import { InviteLinkButton } from '@/components/members/invite-link-button';
import { PendingInvitesList } from '@/components/members/pending-invites-list';
import { JoinRequestsList } from '@/components/members/join-requests-list';
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

  const [trip, role, members, pendingInvites, expensesWithSplits] = await Promise.all([
    getTrip(tripId),
    getUserRole(tripId),
    getMembers(tripId),
    getPendingInvites(tripId),
    getExpensesWithSplits(tripId),
  ]);

  const budgetCurrency = trip?.budget_currency ?? 'VND';
  const balanceMap = new Map(
    calculateMemberBalances(expensesWithSplits)
      .filter((b) => b.currency === budgetCurrency)
      .map((b) => [b.userId, b.net])
  );

  const canManageCheck = role ? ['owner', 'admin'].includes(role) : false;
  const joinRequests = canManageCheck ? await getJoinRequests(tripId) : [];

  if (!trip || !role) {
    notFound();
  }

  const canManage = canManageCheck;

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

      <div className="space-y-6">
        {/* Invite link — owner/admin only */}
        {canManage && (
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-primary-light)' }}
                >
                  <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h2 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                    Share invite link
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                    Generate a link and send it manually. Email invites are not enabled yet.
                  </p>
                </div>
              </div>
              <InviteLinkButton tripId={tripId} />
            </div>
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
            >
              Invite links expire after 7 days. You can create separate links for viewers, editors, or admins.
            </div>
          </div>
        )}

        {/* Join requests */}
        {canManage && (
          <div className="card p-6">
            <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>
              Join requests
              {joinRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                  {joinRequests.length}
                </span>
              )}
            </h2>
            <JoinRequestsList tripId={tripId} initialRequests={joinRequests} />
          </div>
        )}

        {/* Pending invites */}
        {canManage && (
          <div className="card p-6">
            <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--color-text)' }}>
              Active invite links
              {pendingInvites.length > 0 && (
                <span
                  className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600"
                >
                  {pendingInvites.length}
                </span>
              )}
            </h2>
            <PendingInvitesList
              tripId={tripId}
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
            tripId={tripId}
            members={members}
            currentUserId={user.id}
            currentUserRole={role}
            balanceMap={balanceMap}
            balanceCurrency={budgetCurrency}
          />
        </div>
      </div>
    </div>
  );
}
