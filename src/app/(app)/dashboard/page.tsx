import Link from 'next/link';
import { Plus, Compass, Calendar, Users, Globe, Lock, Crown, Pencil, Eye, ShieldCheck } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrips, type TripWithRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { formatDateRange } from '@/lib/date';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Trang chủ' };

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  owner:  { icon: <Crown className="w-3 h-3" />,       label: 'Owner',  color: '#B45309', bg: '#FEF3C7' },
  admin:  { icon: <ShieldCheck className="w-3 h-3" />, label: 'Admin',  color: '#6D28D9', bg: '#EDE9FE' },
  editor: { icon: <Pencil className="w-3 h-3" />,      label: 'Editor', color: '#065F46', bg: '#D1FAE5' },
  viewer: { icon: <Eye className="w-3 h-3" />,         label: 'Viewer', color: '#374151', bg: '#F3F4F6' },
};

async function TripCard({ trip }: { trip: TripWithRole }) {
  const members = await getMembers(trip.id);
  const hasCover = !!trip.cover_image_url;
  const role = ROLE_CONFIG[trip.myRole] ?? ROLE_CONFIG.viewer;
  const isArchived = trip.status === 'archived';
  const isPublic = trip.visibility === 'public';

  return (
    <Link href={`/trips/${trip.id}`} className="card card-hover block group overflow-hidden animate-in slide-up">

      {hasCover ? (
        <div className="relative h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={trip.cover_image_url!}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isArchived && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}>
                Archived
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(0,0,0,0.45)', color: 'white' }}>
              {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {isPublic ? 'Public' : 'Private'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-base leading-snug truncate text-white drop-shadow-sm">{trip.title}</h3>
          </div>
        </div>
      ) : (
        <div className="h-1.5 rounded-t-[1.25rem]" style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, #5EEAD4 100%)' }} />
      )}

      <div className="p-4 space-y-3">
        {!hasCover && (
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
              {trip.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {isArchived && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-subtle)' }}>
                  Archived
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: isPublic ? '#EFF6FF' : 'var(--color-bg-subtle)', color: isPublic ? '#3B82F6' : 'var(--color-text-muted)' }}>
                {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        )}

        {trip.description && (
          <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{trip.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-3 text-xs min-w-0" style={{ color: 'var(--color-text-subtle)' }}>
            {trip.start_date && trip.end_date && (
              <span className="flex items-center gap-1 truncate">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0">
              <Users className="w-3.5 h-3.5" />
              {members.length}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0" style={{ background: role.bg, color: role.color }}>
            {role.icon}
            {role.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const trips = await getTrips();

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>My Trips</h1>
          {trips.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </p>
          )}
        </div>
        <Link href="/trips/new" className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[40px]">
          <Plus className="w-4 h-4" />
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 text-center" style={{ borderStyle: 'dashed' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-mid) 100%)' }}>
            <Compass className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Plan your first adventure</h2>
          <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Collect places, vote on destinations, and split expenses — all in one collaborative workspace.
          </p>
          <Link href="/trips/new" className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[40px]">
            <Plus className="w-4 h-4" />
            New trip
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
