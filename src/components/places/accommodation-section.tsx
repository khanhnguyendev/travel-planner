'use client';

import { useState } from 'react';
import { BedDouble, CalendarDays, Map, Navigation, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment } from '@/lib/types';
import { updatePlaceSchedule } from '@/features/places/actions';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { useLoadingToast } from '@/components/ui/toast';

interface AccommodationSectionProps {
  places: Place[];
  categories: Category[];
  tripId: string;
  currentUserId: string;
  canEdit: boolean;
  voteSummaries: VoteSummaryEntry[];
  userVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function googleMapsUrl(place: Place): string {
  if (place.lat != null && place.lng != null) return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`;
}

function vietmapUrl(place: Place): string {
  if (place.lat != null && place.lng != null) return `https://maps.vietmap.vn/?q=${place.lat},${place.lng}`;
  return `https://maps.vietmap.vn/?q=${encodeURIComponent(place.name)}`;
}

function DatesEditor({ place, canEdit }: { place: Place; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [checkIn, setCheckIn] = useState(place.visit_date ?? '');
  const [checkOut, setCheckOut] = useState(place.checkout_date ?? '');
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();

  async function handleSave() {
    setPending(true);
    const resolve = loadingToast('Saving dates…');
    const result = await updatePlaceSchedule(place.id, {
      visit_date: checkIn || null,
      checkout_date: checkOut || null,
    });
    setPending(false);
    if (result.ok) {
      resolve('Dates saved!', 'success');
      setEditing(false);
    } else {
      resolve(result.error, 'error');
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm transition-all hover:scale-105"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          In: {place.visit_date ? formatDate(place.visit_date) : <span className="opacity-60 italic lowercase font-normal">not set</span>}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-widest border border-orange-100 bg-orange-50 text-orange-600 shadow-sm transition-all hover:scale-105"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Out: {place.checkout_date ? formatDate(place.checkout_date) : <span className="opacity-60 italic lowercase font-normal">not set</span>}
        </span>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-slate-100 transition-all shadow-sm active:scale-90"
            title="Edit dates"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 flex-wrap bg-slate-50/50 p-3 rounded-xl border border-slate-100">
      <div className="flex-1 min-w-[100px]">
        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Check-in</label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
        />
      </div>
      <div className="flex-1 min-w-[100px]">
        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-1">Check-out</label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={pending}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-all shadow-premium active:scale-95"
          title="Save dates"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setEditing(false); setCheckIn(place.visit_date ?? ''); setCheckOut(place.checkout_date ?? ''); }}
          disabled={pending}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 transition-all shadow-sm active:scale-95"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AccommodationCard({
  place,
  canEdit,
  onClick,
}: {
  place: Place;
  canEdit: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="card-premium p-5 flex flex-col gap-4 cursor-pointer group hover:shadow-soft transition-all duration-300 relative overflow-hidden active:scale-[0.98]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />

      {/* Name */}
      <div className="relative">
        <h3 className="font-display font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">{place.name}</h3>
        {place.address && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 italic">{place.address}</p>
        )}
      </div>

      {/* Check-in / Check-out dates */}
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <DatesEditor place={place} canEdit={canEdit} />
      </div>

      {/* Direction buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
        <a
          href={googleMapsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm"
        >
          <Map className="w-4 h-4" />
          <span>Maps</span>
        </a>
        <a
          href={vietmapUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm"
        >
          <Navigation className="w-4 h-4" />
          Vietmap
        </a>
      </div>
    </div>
  );
}

export function AccommodationSection({
  places,
  categories,
  tripId,
  currentUserId,
  canEdit,
  voteSummaries,
  userVotes,
  reviewsByPlaceId,
  commentsByPlaceId,
  commentAuthors,
}: AccommodationSectionProps) {
  const [openPlaceId, setOpenPlaceId] = useState<string | null>(null);

  // Filter to accommodation categories
  const accommodationCategoryIds = new Set(
    categories.filter((c) => c.category_type === 'accommodation').map((c) => c.id)
  );
  const accommodationPlaces = places.filter((p) => accommodationCategoryIds.has(p.category_id));

  if (accommodationPlaces.length === 0) return null;

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const voteSummaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));
  const userVoteMap = Object.fromEntries(userVotes.map((v) => [v.place_id, v]));
  const openPlace = openPlaceId ? accommodationPlaces.find((p) => p.id === openPlaceId) ?? null : null;

  // Sort by check-in date
  const sorted = [...accommodationPlaces].sort((a, b) => {
    if (!a.visit_date && !b.visit_date) return 0;
    if (!a.visit_date) return 1;
    if (!b.visit_date) return -1;
    return a.visit_date.localeCompare(b.visit_date);
  });

  return (
    <>
      <div className="card-premium p-6 mb-8 bg-white/80 backdrop-blur-xl border-white shadow-premium">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-50 text-orange-500 shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
              <BedDouble className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground tracking-tight">Accommodation</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{sorted.length} {sorted.length === 1 ? 'Stay' : 'Stays'} Planned</p>
            </div>
          </div>
          <div className="hidden sm:block">
             <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
               Trip Summary
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((place) => (
            <AccommodationCard
              key={place.id}
              place={place}
              canEdit={canEdit}
              onClick={() => setOpenPlaceId(place.id)}
            />
          ))}
        </div>
      </div>

      {openPlace && (
        <PlaceDetailDrawer
          place={openPlace}
          reviews={reviewsByPlaceId[openPlace.id] ?? []}
          comments={commentsByPlaceId[openPlace.id] ?? []}
          commentAuthors={commentAuthors}
          currentUserId={currentUserId}
          category={categoryMap[openPlace.category_id] ?? null}
          tripId={tripId}
          voteSummary={voteSummaryMap[openPlace.id] ?? null}
          userVote={userVoteMap[openPlace.id] ?? null}
          allPlaces={places}
          canEdit={canEdit}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </>
  );
}
