'use client';

import { useState } from 'react';
import { BedDouble, CalendarDays, Map, Navigation, Pencil, Check, X } from 'lucide-react';
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
  canVote: boolean;
  canComment: boolean;
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
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Check-in: {place.visit_date ? formatDate(place.visit_date) : <span className="opacity-60">Not set</span>}
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Check-out: {place.checkout_date ? formatDate(place.checkout_date) : <span className="opacity-60">Not set</span>}
        </span>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Check-in</label>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Check-out</label>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
        Save
      </button>
      <button
        onClick={() => { setEditing(false); setCheckIn(place.visit_date ?? ''); setCheckOut(place.checkout_date ?? ''); }}
        disabled={pending}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
      >
        <X className="w-3 h-3" />
        Cancel
      </button>
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
      className="card p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {/* Name */}
      <div>
        <h3 className="font-semibold text-base leading-snug text-stone-800">{place.name}</h3>
        {place.address && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{place.address}</p>
        )}
      </div>

      {/* Check-in / Check-out dates */}
      <div onClick={(e) => e.stopPropagation()}>
        <DatesEditor place={place} canEdit={canEdit} />
      </div>

      {/* Direction buttons */}
      <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border-muted)' }} onClick={(e) => e.stopPropagation()}>
        <a
          href={googleMapsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
        >
          <Map className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Google Maps</span>
          <span className="sm:hidden">Maps</span>
        </a>
        <a
          href={vietmapUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium"
        >
          <Navigation className="w-3.5 h-3.5" />
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
  canVote,
  canComment,
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
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF7ED' }}>
            <BedDouble className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="font-semibold text-base text-stone-800">Accommodation</h2>
            <p className="text-xs text-stone-400">{sorted.length} {sorted.length === 1 ? 'place' : 'places'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          canVote={canVote}
          canComment={canComment}
          allPlaces={places}
          canEdit={canEdit}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </>
  );
}
