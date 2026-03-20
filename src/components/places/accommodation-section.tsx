'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BedDouble, CalendarDays, Pencil, Check, X, Sparkles, Trash2 } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import { updatePlaceSchedule, deletePlace } from '@/features/places/actions';
import { PlaceDetailDrawer } from '@/components/places/place-detail-drawer';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { useLoadingToast } from '@/components/ui/toast';
import { PlaceMapLinks } from '@/components/places/place-map-links';
import { PlaceExpenseSummary } from '@/components/places/place-expense-summary';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { useConfirm } from '@/components/ui/confirm-dialog';

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
  placeExpensesByPlaceId: Record<string, PlaceExpenseHistoryEntry[]>;
  commentsByPlaceId: Record<string, PlaceComment[]>;
  commentAuthors: Record<string, string>;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAccommodationStatus(place: Place): 'current' | 'upcoming' | 'completed' {
  const now = Date.now();
  const todayKey = getTodayKey();

  if (place.actual_checkin_at) {
    const actualCheckin = new Date(place.actual_checkin_at).getTime();
    const actualCheckout = place.actual_checkout_at ? new Date(place.actual_checkout_at).getTime() : null;

    if (!Number.isNaN(actualCheckin) && actualCheckin <= now && (!actualCheckout || Number.isNaN(actualCheckout) || actualCheckout > now)) {
      return 'current';
    }

    if (actualCheckout && !Number.isNaN(actualCheckout) && actualCheckout <= now) {
      return 'completed';
    }
  }

  if (place.visit_date && place.checkout_date) {
    if (todayKey < place.visit_date) return 'upcoming';
    if (todayKey > place.checkout_date) return 'completed';
    return 'current';
  }

  if (place.visit_date) {
    if (todayKey < place.visit_date) return 'upcoming';
    if (todayKey > place.visit_date) return 'completed';
    return 'current';
  }

  return 'upcoming';
}

function DatesEditor({ place, canEdit, editing, setEditing }: {
  place: Place;
  canEdit: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(place.visit_date ?? '');
  const [checkOut, setCheckOut] = useState(place.checkout_date ?? '');
  const [pending, setPending] = useState(false);
  const [, startRefreshTransition] = useTransition();
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
      emitTripSectionRefresh(place.trip_id, [
        TRIP_REFRESH_SECTIONS.placeDetail,
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.map,
        TRIP_REFRESH_SECTIONS.activity,
      ]);
      startRefreshTransition(() => {
        router.refresh();
      });
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
  placeExpenses,
  canEdit,
  onClick,
}: {
  place: Place;
  placeExpenses: PlaceExpenseHistoryEntry[];
  canEdit: boolean;
  onClick: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const { confirm } = useConfirm();

  async function handleDelete() {
    const isConfirmed = await confirm({
      title: 'Delete Place',
      message: `Delete "${place.name}" from the trip?`,
      okText: 'Delete',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    setDeleting(true);
    const resolve = loadingToast('Deleting…');
    const result = await deletePlace(place.id);
    setDeleting(false);
    if (result.ok) {
      resolve('Deleted', 'success');
      emitTripSectionRefresh(place.trip_id, [
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.activity,
      ]);
      startTransition(() => router.refresh());
    } else {
      resolve(result.error ?? 'Failed to delete', 'error');
    }
  }

  const stayStatus = getAccommodationStatus(place);
  const isCurrentStay = stayStatus === 'current';

  return (
    <div
      className={`section-shell relative flex cursor-pointer flex-col gap-3 p-4 transition-all hover:-translate-y-1 hover:shadow-xl ${isCurrentStay ? 'pulse-soft' : ''}`}
      style={isCurrentStay ? { boxShadow: '0 0 0 1px rgba(13, 148, 136, 0.18), 0 18px 50px rgba(13, 148, 136, 0.12)' } : undefined}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      {isCurrentStay && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-teal-400/45" />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
            <Sparkles className="h-3 w-3" />
            Current stay
          </span>
        </>
      )}

      {/* Name */}
      <div>
        <h3 className="font-semibold text-base leading-snug text-stone-800">{place.name}</h3>
        {place.address && (
          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{place.address}</p>
        )}
      </div>

      {/* Check-in / Check-out dates */}
      <div onClick={(e) => e.stopPropagation()}>
        <DatesEditor place={place} canEdit={canEdit} editing={editing} setEditing={setEditing} />
      </div>

      {placeExpenses.length > 0 && (
        <PlaceExpenseSummary expenses={placeExpenses} />
      )}

      {/* Direction buttons */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <PlaceMapLinks place={place} />
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--color-border-muted)' }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
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
  placeExpensesByPlaceId,
  commentsByPlaceId,
  commentAuthors,
  tripStartDate,
  tripEndDate,
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
      <div className="section-shell mt-4 mb-6 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm" style={{ color: '#EA580C' }}>
            <BedDouble className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Stay
            </p>
            <h2 className="text-lg font-semibold section-title text-stone-800">Accommodation</h2>
            <p className="text-xs text-stone-400">{sorted.length} {sorted.length === 1 ? 'place' : 'places'} pinned for the trip</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((place) => (
            <AccommodationCard
              key={place.id}
              place={place}
              placeExpenses={placeExpensesByPlaceId[place.id] ?? []}
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
          placeExpenses={placeExpensesByPlaceId[openPlace.id] ?? []}
          canVote={canVote}
          canComment={canComment}
          showExpenseHistory={canComment}
          allPlaces={places}
          canEdit={canEdit}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          onClose={() => setOpenPlaceId(null)}
        />
      )}
    </>
  );
}
