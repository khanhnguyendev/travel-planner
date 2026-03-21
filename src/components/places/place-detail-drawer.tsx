'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, MapPin, Star, DollarSign, ExternalLink, Clock, CalendarDays, ShieldAlert, Pencil, Check, Send, Trash2, MessageCircle, NotebookPen, AlertTriangle, Receipt } from 'lucide-react';
import type { Place, PlaceReview, Category, PlaceVote, PlaceComment, PlaceExpenseHistoryEntry } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { updatePlaceSchedule, updatePlaceNote, addPlaceComment, deletePlaceComment, deletePlace } from '@/features/places/actions';
import type { ConflictingPlace } from '@/features/places/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { CheckInOutButton } from '@/components/places/check-in-out-button';
import { SwapPlaceButton } from '@/components/places/swap-place-button';
import { PlaceMapLinks } from '@/components/places/place-map-links';
import { PlaceExpenseHistory } from '@/components/places/place-expense-history';
import { RefreshOverlay } from '@/components/ui/refresh-overlay';
import { emitTripSectionRefresh, useTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { formatInTripTimezone } from '@/lib/date';

interface PlaceDetailDrawerProps {
  place: Place;
  reviews: PlaceReview[];
  comments: PlaceComment[];
  commentAuthors: Record<string, string>; // userId -> displayName
  currentUserId: string;
  category: Category | null;
  tripId: string;
  voteSummary: VoteSummaryEntry | null;
  userVote: PlaceVote | null;
  placeExpenses?: PlaceExpenseHistoryEntry[];
  canVote?: boolean;
  canComment?: boolean;
  showExpenseHistory?: boolean;
  allPlaces?: Place[];
  canEdit?: boolean;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onClose: () => void;
  onDeleted?: () => void;
  onUpdated?: (place: Place) => void;
}

function StarFull({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-current' : ''}`}
          style={{ color: i < Math.round(rating) ? '#EAB308' : 'var(--color-border)' }}
        />
      ))}
      <span className="ml-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 4 }, (_, i) => (
        <DollarSign
          key={i}
          className="w-4 h-4"
          style={{ color: i < level ? 'var(--color-secondary)' : 'var(--color-border)' }}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {review.author_name ?? 'Anonymous'}
          </p>
          {review.published_at && (
            <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              {formatInTripTimezone(new Date(review.published_at), { year: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
        {review.rating != null && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: review.rating }, (_, i) => (
              <Star key={i} className="w-3 h-3 fill-current" style={{ color: '#EAB308' }} />
            ))}
          </div>
        )}
      </div>
      {review.text && (
        <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'var(--color-text-muted)' }}>
          {review.text}
        </p>
      )}
    </div>
  );
}

function ScheduleEditor({
  place,
  allPlaces,
  canEdit,
  tripId,
  tripStartDate,
  tripEndDate,
  affectsStops,
  onUpdated,
}: {
  place: Place;
  allPlaces: Place[];
  canEdit: boolean;
  tripId: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  affectsStops: boolean;
  onUpdated?: (place: Place) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  // Saved state mirrors what's in the DB — updated on successful save so view mode stays fresh
  const [savedDate, setSavedDate] = useState(place.visit_date ?? '');
  const [savedDateEnd, setSavedDateEnd] = useState(place.visit_date_end ?? '');
  const [savedFrom, setSavedFrom] = useState(place.visit_time_from ?? '');
  const [savedTo, setSavedTo] = useState(place.visit_time_to ?? '');
  const [savedBackupId, setSavedBackupId] = useState(place.backup_place_id ?? '');
  // Draft state used while editing
  const [date, setDate] = useState(savedDate);
  const [dateEnd, setDateEnd] = useState(savedDateEnd);
  const [from, setFrom] = useState(savedFrom);
  const [to, setTo] = useState(savedTo);
  const [backupId, setBackupId] = useState(savedBackupId);
  const [pending, setPending] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const [conflicts, setConflicts] = useState<ConflictingPlace[]>([]);
  const loadingToast = useLoadingToast();

  const otherPlaces = allPlaces.filter((p) => p.id !== place.id);
  const savedBackupPlace = allPlaces.find((p) => p.id === savedBackupId);

  function openEditor() {
    setDate(savedDate);
    setDateEnd(savedDateEnd);
    setFrom(savedFrom);
    setTo(savedTo);
    setBackupId(savedBackupId);
    setEditing(true);
  }

  async function handleSave() {
    setPending(true);
    const resolve = loadingToast('Saving schedule…');
    const result = await updatePlaceSchedule(place.id, {
      visit_date: date || null,
      visit_date_end: dateEnd || null,
      visit_time_from: from || null,
      visit_time_to: to || null,
      backup_place_id: backupId || null,
    });
    setPending(false);
    if (result.ok) {
      resolve('Schedule saved!', 'success');
      setSavedDate(date);
      setSavedDateEnd(dateEnd);
      setSavedFrom(from);
      setSavedTo(to);
      setSavedBackupId(backupId);
      setConflicts(result.conflicts ?? []);
      onUpdated?.({
        ...place,
        visit_date: date || null,
        visit_date_end: dateEnd || null,
        visit_time_from: from || null,
        visit_time_to: to || null,
        backup_place_id: backupId || null,
      });
      setEditing(false);
      emitTripSectionRefresh(tripId, [
        TRIP_REFRESH_SECTIONS.placeDetail,
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.map,
        TRIP_REFRESH_SECTIONS.activity,
        ...(affectsStops ? [TRIP_REFRESH_SECTIONS.stops] : []),
      ]);
      startRefreshTransition(() => {
        router.refresh();
      });
    } else {
      resolve(result.error, 'error');
    }
  }

  if (!editing) {
    const hasSchedule = savedDate || savedFrom;
    return (
      <div className="space-y-2">
        {hasSchedule ? (
          <div className="flex items-center gap-2 flex-wrap">
            {savedDate && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                <CalendarDays className="w-3.5 h-3.5" />
                {formatInTripTimezone(new Date(savedDate + 'T00:00:00+07:00'), { month: 'short', day: 'numeric', year: 'numeric' })}
                {savedDateEnd && savedDateEnd !== savedDate && (
                  <> → {formatInTripTimezone(new Date(savedDateEnd + 'T00:00:00+07:00'), { month: 'short', day: 'numeric', year: 'numeric' })}</>
                )}
              </span>
            )}
            {(savedFrom || savedTo) && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {savedFrom ? savedFrom.split(':').slice(0, 2).join(':') : '?'} – {savedTo ? savedTo.split(':').slice(0, 2).join(':') : '?'}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone-400">No visit time set</p>
        )}

        {savedBackupPlace && (
          <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Backup: <span className="font-medium">{savedBackupPlace.name}</span></span>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Time overlap with:
            </div>
            {conflicts.map((c) => (
              <p key={c.id} className="text-xs text-amber-700 pl-5">
                {c.name} ({c.visit_time_from}{c.visit_time_to ? ` – ${c.visit_time_to}` : ''})
              </p>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openEditor}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors mt-1 cursor-pointer"
              style={{
                backgroundColor: hasSchedule || savedBackupPlace ? 'var(--color-bg-subtle)' : 'var(--color-primary-light)',
                color: hasSchedule || savedBackupPlace ? 'var(--color-text-muted)' : 'var(--color-primary)',
              }}
            >
              <Pencil className="w-3 h-3" />
              {hasSchedule || savedBackupPlace ? 'Edit schedule' : 'Add schedule'}
            </button>
            {hasSchedule && allPlaces && allPlaces.length > 1 && (
              <SwapPlaceButton place={place} allPlaces={allPlaces} tripId={tripId} affectsStops={affectsStops} />
            )}
          </div>
        )}
      </div>
    );
  }

  // Compact editing layout: date + from + to all in one row
  return (
    <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Start date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); if (!e.target.value) setDateEnd(''); }}
            min={tripStartDate ?? undefined}
            max={tripEndDate ?? undefined}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">End date <span className="text-stone-400 font-normal">(optional)</span></label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            min={date || tripStartDate || undefined}
            max={tripEndDate ?? undefined}
            disabled={!date}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">From</label>
          <input
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">To</label>
          <input
            type="time"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>
      {otherPlaces.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            Backup <span className="text-stone-400 font-normal">(if closed)</span>
          </label>
          <select
            value={backupId}
            onChange={(e) => setBackupId(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">No backup</option>
            {otherPlaces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={handleSave}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-teal-700 disabled:opacity-50 sm:w-auto"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={pending}
          className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-600 transition-colors hover:bg-stone-100 sm:w-auto"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NoteEditor({
  place,
  canEdit,
  tripId,
  onUpdated,
}: {
  place: Place;
  canEdit: boolean;
  tripId: string;
  onUpdated?: (place: Place) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(place.note ?? '');
  const [pending, setPending] = useState(false);
  const [, startRefreshTransition] = useTransition();
  const loadingToast = useLoadingToast();

  async function handleSave() {
    setPending(true);
    const resolve = loadingToast('Saving note…');
    const result = await updatePlaceNote(place.id, text.trim() || null);
    setPending(false);
    if (result.ok) {
      resolve('Note saved!', 'success');
      onUpdated?.({ ...place, note: text.trim() || null });
      setEditing(false);
      emitTripSectionRefresh(tripId, [
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

  if (!canEdit) {
    if (!place.note) return null;
    return (
      <p className="text-sm leading-relaxed text-stone-600 whitespace-pre-wrap">{place.note}</p>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        {place.note ? (
          <p className="text-sm leading-relaxed text-stone-600 whitespace-pre-wrap">{place.note}</p>
        ) : (
          <p className="text-xs text-stone-400">No note yet</p>
        )}
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          style={{
            backgroundColor: place.note ? 'var(--color-bg-subtle)' : 'var(--color-primary-light)',
            color: place.note ? 'var(--color-text-muted)' : 'var(--color-primary)',
          }}
        >
          <Pencil className="w-3 h-3" />
          {place.note ? 'Edit note' : 'Add note'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a private note visible only to editors…"
        rows={4}
        maxLength={2000}
        disabled={pending}
        className="w-full text-sm px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={() => { setEditing(false); setText(place.note ?? ''); }}
          disabled={pending}
          className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CommentsSection({
  placeId,
  tripId,
  initialComments,
  commentAuthors,
  currentUserId,
  canComment,
}: {
  placeId: string;
  tripId: string;
  initialComments: PlaceComment[];
  commentAuthors: Record<string, string>;
  currentUserId: string;
  canComment: boolean;
}) {
  const [comments, setComments] = useState<PlaceComment[]>(initialComments);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    const resolve = loadingToast('Posting comment…');
    const result = await addPlaceComment(placeId, tripId, body);
    setPending(false);
    if (result.ok && result.data) {
      resolve('Comment posted!', 'success');
      setComments((prev) => [...prev, result.data!]);
      setBody('');
    } else {
      resolve(!result.ok ? result.error : 'Failed', 'error');
    }
  }

  async function handleDelete(commentId: string) {
    const resolve = loadingToast('Deleting…');
    const result = await deletePlaceComment(commentId, tripId);
    if (result.ok) {
      resolve('Comment deleted', 'success');
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      resolve(result.error ?? 'Failed', 'error');
    }
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-stone-400">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-2.5 p-3 rounded-xl bg-stone-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-stone-700">
                    {commentAuthors[c.user_id] ?? 'Member'}
                  </span>
                  <span className="text-xs text-stone-400">
                    {formatInTripTimezone(new Date(c.created_at), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{c.body}</p>
              </div>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 flex-shrink-0"
                  aria-label="Delete comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      {canComment ? (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            maxLength={1000}
            disabled={pending}
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="self-end inline-flex items-center justify-center gap-1.5 px-4 py-2 sm:w-9 sm:h-9 sm:px-0 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors flex-shrink-0 text-sm sm:text-base"
            aria-label="Post comment"
          >
            <Send className="w-4 h-4" />
            <span className="sm:hidden">Send</span>
          </button>
        </form>
      ) : (
        <p className="text-xs text-stone-400">
          Comments are available to trip members.
        </p>
      )}
    </div>
  );
}

export function PlaceDetailDrawer({
  place,
  reviews,
  comments,
  commentAuthors,
  currentUserId,
  category,
  tripId,
  voteSummary,
  userVote,
  placeExpenses = [],
  canVote = true,
  canComment = true,
  showExpenseHistory = false,
  allPlaces = [],
  canEdit = false,
  tripStartDate,
  tripEndDate,
  onClose,
  onDeleted,
  onUpdated,
}: PlaceDetailDrawerProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const loadingToastDrawer = useLoadingToast();
  const { confirm } = useConfirm();
  const affectsStops = category?.category_type !== 'accommodation';
  const refreshSignature = [
    place.id,
    place.visit_date ?? '',
    place.visit_date_end ?? '',
    place.visit_time_from ?? '',
    place.visit_time_to ?? '',
    place.checkout_date ?? '',
    place.backup_place_id ?? '',
    place.note ?? '',
    place.actual_checkin_at ?? '',
    place.actual_checkout_at ?? '',
    placeExpenses.map((expense) => `${expense.id}:${expense.amount}:${expense.created_at}`).join(','),
  ].join('|');
  const isSectionRefreshing = useTripSectionRefresh({
    tripId,
    sections: TRIP_REFRESH_SECTIONS.placeDetail,
    signature: refreshSignature,
  });

  async function handleDelete() {
    const isConfirmed = await confirm({
      title: 'Remove Place',
      message: `Remove "${place.name}" from this trip?`,
      okText: 'Remove',
      variant: 'danger',
    });
    if (!isConfirmed) return;
    setDeleting(true);
    const resolve = loadingToastDrawer('Removing place…');
    const result = await deletePlace(place.id);
    setDeleting(false);
    if (result.ok) {
      resolve('Place removed', 'success');
      emitTripSectionRefresh(tripId, [
        TRIP_REFRESH_SECTIONS.placeDetail,
        TRIP_REFRESH_SECTIONS.places,
        TRIP_REFRESH_SECTIONS.timeline,
        TRIP_REFRESH_SECTIONS.map,
        TRIP_REFRESH_SECTIONS.activity,
        ...(affectsStops ? [TRIP_REFRESH_SECTIONS.stops] : []),
      ]);
      onDeleted?.();
      onClose();
      startRefreshTransition(() => {
        router.refresh();
      });
    } else {
      resolve(result.error, 'error');
    }
  }
  const overlayRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-[120] flex items-center justify-center overflow-x-hidden px-2 py-3 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
      <aside
        className="relative mx-auto flex max-h-[92dvh] w-full min-w-0 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[1.5rem] sm:max-h-[90dvh] sm:max-w-4xl"
        style={{ backgroundColor: 'var(--color-bg)' }}
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b p-4 sm:p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex-1 min-w-0 pr-3">
            {(() => {
              const meta = place.metadata_json as { place?: string } | null;
              const tag = meta?.place ?? null;
              return (category || tag) ? (
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {category && <CategoryBadge category={category} size="sm" />}
                  {tag && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}
                    >
                      <MapPin className="w-3 h-3" />
                      {tag}
                    </span>
                  )}
                </div>
              ) : null;
            })()}
            <h2 className="text-xl font-bold leading-snug text-stone-800">{place.name}</h2>
            {place.address && (
              <p className="flex items-start gap-1 text-sm mt-1 text-stone-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {place.address}
              </p>
            )}
            <PlaceMapLinks place={place} className="mt-3 flex-wrap" />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 rounded-lg transition-colors hover:bg-red-50 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                style={{ color: '#EF4444' }}
                aria-label="Delete place"
                title="Remove from trip"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-stone-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 sm:space-y-6 sm:p-5">
          {/* Rating + price */}
          {(place.rating != null || place.price_level != null) && (
            <div className="flex items-center gap-4 flex-wrap">
              {place.rating != null && <StarFull rating={place.rating} />}
              {place.price_level != null && <PriceLevel level={place.price_level} />}
            </div>
          )}

          {/* Editorial summary */}
          {place.editorial_summary && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 text-stone-400">About</h3>
              <p className="text-sm leading-relaxed text-stone-600">{place.editorial_summary}</p>
            </div>
          )}

          {/* Schedule + backup */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400">Visit schedule</h3>
            <ScheduleEditor place={place} allPlaces={allPlaces} canEdit={canEdit} tripId={tripId} tripStartDate={tripStartDate} tripEndDate={tripEndDate} affectsStops={affectsStops} onUpdated={onUpdated} />
          </div>

          {/* Check-in / Check-out (editors only, only if place has a visit date) */}
          {canEdit && place.visit_date && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400">Check-in / Check-out</h3>
              <CheckInOutButton
                place={place}
                allDayPlaces={allPlaces.filter((p) => p.visit_date === place.visit_date)}
                tripId={tripId}
                affectsStops={affectsStops}
              />
            </div>
          )}

          {/* Note (editors write, viewers read) */}
          {(canEdit || place.note) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400 flex items-center gap-1.5">
                <NotebookPen className="w-3.5 h-3.5" />
                Note
                {!canEdit && <span className="font-normal normal-case text-stone-300">(editor only)</span>}
              </h3>
              <NoteEditor place={place} canEdit={canEdit} tripId={tripId} onUpdated={onUpdated} />
            </div>
          )}

          {showExpenseHistory && (
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                <Receipt className="h-3.5 w-3.5" />
                Place expenses {placeExpenses.length > 0 && `(${placeExpenses.length})`}
              </h3>
              <PlaceExpenseHistory
                tripId={tripId}
                expenses={placeExpenses}
                emptyLabel="No expenses are linked to this place yet."
              />
            </div>
          )}

          {/* Votes */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400">Your vote</h3>
            <VoteButtons
              tripId={tripId}
              placeId={place.id}
              upvotes={voteSummary?.upvotes ?? 0}
              downvotes={voteSummary?.downvotes ?? 0}
              userVote={userVote}
              canVote={canVote}
            />
            {!canVote && (
              <p className="mt-2 text-xs text-stone-400">
                Voting is available to trip members while the trip is active.
              </p>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>
            <CommentsSection
              placeId={place.id}
              tripId={tripId}
              initialComments={comments}
              commentAuthors={commentAuthors}
              currentUserId={currentUserId}
              canComment={canComment}
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 text-stone-400">Reviews</h3>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {place.source_url && (
            <a
              href={place.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm min-h-[44px]"
              style={{ color: 'var(--color-primary)' }}
            >
              <ExternalLink className="w-4 h-4" />
              View on map
            </a>
          )}
        </div>
        {(isRefreshing || isSectionRefreshing) && <RefreshOverlay label="Updating place" />}
      </aside>
      </div>
    </>,
    document.body
  );
}
