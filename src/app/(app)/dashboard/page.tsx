import Link from 'next/link';
import { Plus, Compass, Calendar, Users, Globe, Lock } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { getTrips, type TripWithRole } from '@/features/trips/queries';
import { getMembers } from '@/features/members/queries';
import { formatDateRange } from '@/lib/date';
import { PageHeader } from '@/components/ui/page-header';
import type { Trip } from '@/lib/types';
import type { Metadata } from 'next';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'My Adventures',
};

function VisibilityBadge({ visibility }: { visibility: Trip['visibility'] }) {
  const isPublic = visibility === 'public';
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition-all",
      isPublic ? "bg-blue-500/10 text-blue-500 border border-blue-200/20" : "bg-slate-500/10 text-slate-500 border border-slate-200/20"
    )}>
      {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {isPublic ? 'Public' : 'Private'}
    </span>
  );
}

function StatusBadge({ status }: { status: Trip['status'] }) {
  const isArchived = status === 'archived';
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
      isArchived ? "bg-slate-500/10 text-slate-500 border-slate-200/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-200/20"
    )}>
      {isArchived ? 'Archived' : 'Active'}
    </span>
  );
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  owner:  { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Owner', border: 'border-amber-200/20' },
  admin:  { bg: 'bg-indigo-500/10', text: 'text-indigo-600', label: 'Admin', border: 'border-indigo-200/20' },
  editor: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Editor', border: 'border-emerald-200/20' },
  viewer: { bg: 'bg-slate-500/10', text: 'text-slate-500', label: 'Viewer', border: 'border-slate-200/20' },
};

function RoleBadge({ role }: { role: string }) {
  const s = ROLE_STYLES[role] ?? ROLE_STYLES.viewer;
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border",
      s.bg, s.text, s.border
    )}>
      {s.label}
    </span>
  );
}

async function ProjectCard({ trip }: { trip: TripWithRole }) {
  const members = await getMembers(trip.id);
  const hasCover = !!trip.cover_image_url;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block card-premium overflow-hidden animate-fade-in-up transition-all hover:scale-[1.01] hover:shadow-premium"
    >
      <div className="relative h-48 w-full overflow-hidden">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.cover_image_url!}
            alt={`${trip.title} cover`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
            <Compass className="w-12 h-12 text-primary/20 animate-float" />
          </div>
        )}
        
        {/* Gradient Overlay for Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <VisibilityBadge visibility={trip.visibility} />
            <StatusBadge status={trip.status} />
          </div>
        </div>

        {/* Bottom Title Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <RoleBadge role={trip.myRole} />
          <h3 className="mt-2 font-display font-bold text-xl text-white tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
            {trip.title}
          </h3>
        </div>
      </div>

      <div className="p-5">
        {trip.description && (
          <p className="text-sm line-clamp-2 text-muted-foreground mb-5 leading-relaxed">
            {trip.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>
                {trip.start_date && trip.end_date 
                  ? formatDateRange(trip.start_date, trip.end_date)
                  : 'Dates Pending'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              <Users className="w-3.5 h-3.5 text-secondary" />
              <span>{members.length} {members.length === 1 ? 'Member' : 'Members'}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const trips = await getTrips();

  const headerAction = (
    <Link
      href="/trips/new"
      className="btn-premium py-2 sm:py-3"
    >
      <Plus className="w-5 h-5 mr-1" />
      <span className="hidden sm:inline">New Adventure</span>
      <span className="sm:hidden">New Trip</span>
    </Link>
  );

  return (
    <div className="animate-in fade-in duration-700">
      <PageHeader
        title="My Adventures"
        breadcrumbs={[{ label: 'Dashboard' }]}
        action={headerAction}
      />

      {trips.length === 0 ? (
        <div className="card-premium flex flex-col items-center justify-center py-24 text-center px-6 border-dashed border-2">
          <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 text-primary flex items-center justify-center mb-8 animate-float shadow-soft shadow-primary/20">
            <Compass className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4 text-foreground tracking-tight">
            No expeditions found
          </h2>
          <p className="text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed text-lg font-medium opacity-80">
            Adventure is out there. Start building your bridge to the next destination together.
          </p>
          <Link
            href="/trips/new"
            className="btn-premium scale-110 hover:scale-[1.15]"
          >
            <Plus className="w-6 h-6 mr-2" />
            Create First Expedition
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map((trip) => (
            <ProjectCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
