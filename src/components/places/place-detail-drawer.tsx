'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Star, DollarSign, ExternalLink, Clock, CalendarDays, ShieldAlert, Pencil, Check, Map, Navigation, Send, Trash2, MessageCircle, NotebookPen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Place, PlaceReview, Category, PlaceVote, PlaceComment } from '@/lib/types';
import { CategoryBadge } from '@/components/categories/category-badge';
import { VoteButtons } from '@/components/votes/vote-buttons';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { updatePlaceSchedule, updatePlaceNote, addPlaceComment, deletePlaceComment } from '@/features/places/actions';
import { useLoadingToast } from '@/components/ui/toast';

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
  allPlaces?: Place[];
  canEdit?: boolean;
  onClose: () => void;
}

function StarFull({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm transition-all hover:scale-105">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3.5 h-3.5",
              i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-amber-200"
            )}
          />
        ))}
      </div>
      <span className="font-display font-bold text-sm text-amber-700 leading-none pt-0.5">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-105">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 4 }, (_, i) => (
          <DollarSign
            key={i}
            className={cn(
              "w-3.5 h-3.5",
              i < level ? "text-primary" : "text-slate-200"
            )}
          />
        ))}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none pt-0.5 ml-1">
        Price
      </span>
    </div>
  );
}

function ReviewCard({ review }: { review: PlaceReview }) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-soft group hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
      
      <div className="flex items-start justify-between gap-3 mb-4 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm uppercase">
            {review.author_name?.[0] ?? 'A'}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {review.author_name ?? 'Anonymous'}
            </p>
            {review.published_at && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {new Date(review.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
        </div>
        {review.rating != null && (
          <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
            {Array.from({ length: review.rating }, (_, i) => (
              <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        )}
      </div>
      {review.text && (
        <p className="text-sm leading-relaxed text-slate-600 line-clamp-4 relative italic">
          "{review.text}"
        </p>
      )}
    </div>
  );
}

function ScheduleEditor({ place, allPlaces }: { place: Place; allPlaces: Place[] }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(place.visit_date ?? '');
  const [from, setFrom] = useState(place.visit_time_from ?? '');
  const [to, setTo] = useState(place.visit_time_to ?? '');
  const [backupId, setBackupId] = useState(place.backup_place_id ?? '');
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();

  const otherPlaces = allPlaces.filter((p) => p.id !== place.id);
  const backupPlace = allPlaces.find((p) => p.id === place.backup_place_id);

  async function handleSave() {
    setPending(true);
    const resolve = loadingToast('Saving schedule…');
    const result = await updatePlaceSchedule(place.id, {
      visit_date: date || null,
      visit_time_from: from || null,
      visit_time_to: to || null,
      backup_place_id: backupId || null,
    });
    setPending(false);
    if (result.ok) {
      resolve('Schedule saved!', 'success');
      setEditing(false);
    } else {
      resolve(result.error, 'error');
    }
  }

  if (!editing) {
    const hasSchedule = place.visit_date || place.visit_time_from;
    return (
      <div className="space-y-3">
        {hasSchedule ? (
          <div className="flex items-center gap-2 flex-wrap">
            {place.visit_date && (
              <span className="inline-flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest border border-emerald-100 shadow-sm transition-all hover:scale-105">
                <CalendarDays className="w-4 h-4" />
                {new Date(place.visit_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {(place.visit_time_from || place.visit_time_to) && (
              <span className="inline-flex items-center gap-2 text-[10px] px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 font-bold uppercase tracking-widest border border-teal-100 shadow-sm transition-all hover:scale-105">
                <Clock className="w-4 h-4" />
                {place.visit_time_from ?? '?'} – {place.visit_time_to ?? '?'}
              </span>
            )}
          </div>
        ) : (
          <div className="py-4 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">No visit time scheduled</p>
          </div>
        )}

        {backupPlace && (
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-4 py-3 rounded-2xl border border-orange-100 shadow-soft animate-in fade-in slide-in-from-left-2 transition-all hover:scale-[1.02]">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>Backup Plan: <span className="text-orange-700">{backupPlace.name}</span></span>
          </div>
        )}

        <button
          onClick={() => setEditing(true)}
          className={cn(
            "w-full flex items-center justify-center gap-2 h-11 rounded-2xl font-display font-bold uppercase tracking-widest text-[11px] transition-all duration-300 shadow-sm active:scale-95 group",
            hasSchedule || backupPlace 
              ? "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white hover:text-primary hover:border-primary/30" 
              : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-premium"
          )}
        >
          <Pencil className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
          {hasSchedule || backupPlace ? 'Update Schedule' : 'Schedule Visit'}
        </button>
      </div>
    );
  }

  // Compact editing layout: date + from + to all in one row
  return (
    <div className="space-y-5 p-5 rounded-3xl border border-slate-100 bg-slate-50/50 shadow-inner group animate-in zoom-in-95 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Visit Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs px-3 h-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm font-bold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Arrival</label>
          <input
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full text-xs px-3 h-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm font-bold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Departure</label>
          <input
            type="time"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full text-xs px-3 h-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm font-bold"
          />
        </div>
      </div>
      {otherPlaces.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
            Contingency Plan <span className="text-slate-300 font-normal">(Backup if closed)</span>
          </label>
          <select
            value={backupId}
            onChange={(e) => setBackupId(e.target.value)}
            className="w-full text-xs px-3 h-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm font-bold appearance-none cursor-pointer"
          >
            <option value="">Select failure fallback…</option>
            {otherPlaces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-display font-bold uppercase tracking-widest text-[11px] hover:bg-primary-dark shadow-premium transition-all active:scale-95 disabled:grayscale"
        >
          {pending ? <Check className="w-4 h-4 animate-ping" /> : <Check className="w-4 h-4" />}
          {pending ? 'Saving Changes…' : 'Save Schedule'}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={pending}
          className="px-6 h-11 rounded-2xl border border-slate-200 bg-white text-slate-500 font-display font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all active:scale-95"
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
}: {
  place: Place;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(place.note ?? '');
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();

  async function handleSave() {
    setPending(true);
    const resolve = loadingToast('Saving note…');
    const result = await updatePlaceNote(place.id, text.trim() || null);
    setPending(false);
    if (result.ok) {
      resolve('Note saved!', 'success');
      setEditing(false);
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
      <div className="space-y-4">
        {place.note ? (
          <div className="relative p-5 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap relative italic">"{place.note}"</p>
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">No collaborative notes yet</p>
          </div>
        )}
        
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 h-11 rounded-2xl font-display font-bold uppercase tracking-widest text-[11px] transition-all duration-300 shadow-sm active:scale-95 group",
              place.note 
                ? "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-white hover:text-primary hover:border-primary/30" 
                : "bg-primary/5 text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-premium"
            )}
          >
            <Pencil className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
            {place.note ? 'Update Note' : 'Add Shared Note'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in zoom-in-95 duration-300">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share tips, reservation numbers, or local secrets with the team…"
        rows={6}
        maxLength={2000}
        disabled={pending}
        className="w-full text-sm px-5 py-4 rounded-3xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-premium resize-none disabled:opacity-50 placeholder:text-slate-300 font-medium"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-display font-bold uppercase tracking-widest text-[11px] hover:bg-primary-dark shadow-premium transition-all active:scale-95 disabled:grayscale"
        >
          {pending ? <Check className="w-4 h-4 animate-ping" /> : <Check className="w-4 h-4" />}
          {pending ? 'Saving Note…' : 'Save Changes'}
        </button>
        <button
          onClick={() => { setEditing(false); setText(place.note ?? ''); }}
          disabled={pending}
          className="px-6 h-11 rounded-2xl border border-slate-200 bg-white text-slate-500 font-display font-bold uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all active:scale-95"
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
}: {
  placeId: string;
  tripId: string;
  initialComments: PlaceComment[];
  commentAuthors: Record<string, string>;
  currentUserId: string;
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
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">No discussions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="group flex gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-soft transition-all hover:border-primary/20">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 border border-slate-200 shadow-inner">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">
                    {commentAuthors[c.user_id] ?? 'Trip Member'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.body}</p>
              </div>
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 flex-shrink-0 active:scale-90"
                  aria-label="Delete comment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-1 bg-slate-50 rounded-[22px] border border-slate-200 shadow-inner focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          disabled={pending}
          className="flex-1 text-sm px-4 py-3 bg-transparent focus:outline-none disabled:opacity-50 font-medium"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="w-10 h-10 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-all flex-shrink-0 flex items-center justify-center shadow-premium active:scale-90"
          aria-label="Post comment"
        >
          {pending ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}

function googleMapsUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`;
}

function vietmapUrl(place: Place): string {
  if (place.lat != null && place.lng != null) {
    return `https://maps.vietmap.vn/?q=${place.lat},${place.lng}`;
  }
  return `https://maps.vietmap.vn/?q=${encodeURIComponent(place.name)}`;
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
  allPlaces = [],
  canEdit = false,
  onClose,
}: PlaceDetailDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
      <aside
        className="relative w-full rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden max-h-[95dvh] sm:max-h-[90dvh]"
        style={{ backgroundColor: 'var(--color-bg)' }}
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-2 sm:hidden bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="w-12 h-1.5 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between p-6 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-3">
              {category && (
                <CategoryBadge category={category} size="sm" />
              )}
              {place.editorial_summary && (
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                  Featured
                </span>
              )}
            </div>
            <h2 className="text-2xl font-display font-bold leading-tight text-slate-900 tracking-tight">{place.name}</h2>
            {place.address && (
              <p className="flex items-start gap-1.5 text-xs mt-2 text-slate-500 font-medium italic">
                <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary/60" />
                {place.address}
              </p>
            )}
            
            {/* Map Action Buttons */}
            <div className="flex items-center gap-3 mt-5 flex-wrap">
              <a
                href={googleMapsUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-sm border border-blue-100"
              >
                <Map className="w-4 h-4" />
                <span>Google Maps</span>
              </a>
              <a
                href={vietmapUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-sm border border-emerald-100"
              >
                <Navigation className="w-4 h-4" />
                <span>Vietmap Nav</span>
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-200 flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 transition-transform hover:rotate-90" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 pb-12 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_40%)] from-primary/5">
          {/* Rating + price */}
          {(place.rating != null || place.price_level != null) && (
            <div className="flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-4 duration-500">
              {place.rating != null && <StarFull rating={place.rating} />}
              {place.price_level != null && <PriceLevel level={place.price_level} />}
            </div>
          )}

          {/* Editorial summary */}
          {place.editorial_summary && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-75">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1 flex items-center gap-2">
                <ShieldAlert className="w-3 h-3 text-primary/40" />
                Curation Summary
              </h3>
              <div className="p-5 rounded-3xl bg-slate-50/50 border border-slate-100 italic font-medium leading-relaxed">
                <p className="text-sm text-slate-600 line-clamp-6">{place.editorial_summary}</p>
              </div>
            </div>
          )}

          {/* Note (editors write, viewers read) */}
          {(canEdit || place.note) && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                  <NotebookPen className="w-3.5 h-3.5 text-primary/40" />
                  Team Strategy
                </h3>
                {!canEdit && <span className="text-[9px] font-bold text-slate-300 italic">Editor Restricted Access</span>}
              </div>
              <NoteEditor place={place} canEdit={canEdit} />
            </div>
          )}

          {/* Schedule + backup */}
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary/40" />
              Visit Schedule
            </h3>
            <ScheduleEditor place={place} allPlaces={allPlaces} />
          </div>

          {/* Votes */}
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-primary/40" />
              Your Assessment
            </h3>
            <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-soft">
              <VoteButtons
                tripId={tripId}
                placeId={place.id}
                upvotes={voteSummary?.upvotes ?? 0}
                downvotes={voteSummary?.downvotes ?? 0}
                userVote={userVote}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-300">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-primary/40" />
                Collaborative Intel
              </h3>
              {comments.length > 0 && <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{comments.length} Messages</span>}
            </div>
            <CommentsSection
              placeId={place.id}
              tripId={tripId}
              initialComments={comments}
              commentAuthors={commentAuthors}
              currentUserId={currentUserId}
            />
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-500">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1 flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-primary/40" />
                Global Reviews
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {reviews.map((r, idx) => (
                  <div key={r.id} className={cn(idx >= 3 && "hidden sm:block")}>
                    <ReviewCard review={r} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {place.source_url && (
            <div className="pt-4 flex justify-center">
              <a
                href={place.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary hover:text-primary-dark transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span>Inspect on External Map Provider</span>
              </a>
            </div>
          )}
        </div>
      </aside>
      </div>
    </>
  );
}
