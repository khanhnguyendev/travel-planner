'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car, Bus, Plane, Plus, X, Check, Trash2, ChevronDown, ChevronUp,
  MapPin, CalendarDays, Clock, Tag, Hash, AlignLeft,
} from 'lucide-react';
import type { TransportBooking, TransportType } from '@/lib/types';
import { addTransportBooking, deleteTransportBooking } from '@/features/transport/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function transportIcon(type: TransportType, className = 'w-4 h-4') {
  if (type === 'rent') return <Car className={className} />;
  if (type === 'bus') return <Bus className={className} />;
  return <Plane className={className} />;
}

function transportLabel(type: TransportType) {
  if (type === 'rent') return 'Car rental';
  if (type === 'bus') return 'Bus';
  return 'Flight';
}

const TYPE_COLORS: Record<TransportType, { bg: string; text: string }> = {
  rent: { bg: '#EEF2FF', text: '#4338CA' },
  bus: { bg: '#F0FDF4', text: '#166534' },
  plane: { bg: '#EFF6FF', text: '#1D4ED8' },
};

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatCost(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

// ---------------------------------------------------------------------------
// TransportCard
// ---------------------------------------------------------------------------

function TransportCard({
  booking,
  canEdit,
  tripId,
  onDeleted,
}: {
  booking: TransportBooking;
  canEdit: boolean;
  tripId: string;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const colors = TYPE_COLORS[booking.transport_type];

  async function handleDelete() {
    if (!confirm('Delete this transport booking? The linked expense will also be removed.')) return;
    setDeleting(true);
    const resolve = loadingToast('Deleting…');
    const result = await deleteTransportBooking(booking.id);
    setDeleting(false);
    if (result.ok) {
      resolve('Deleted', 'success');
      emitTripSectionRefresh(tripId, [TRIP_REFRESH_SECTIONS.places, TRIP_REFRESH_SECTIONS.activity]);
      startTransition(() => router.refresh());
      onDeleted();
    } else {
      resolve(result.error ?? 'Failed', 'error');
    }
  }

  return (
    <div className="section-shell flex flex-col gap-0 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
      >
        {/* Type badge */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {transportIcon(booking.transport_type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
              {transportLabel(booking.transport_type)}
            </span>
            {booking.provider && (
              <span className="text-sm font-semibold text-stone-800 truncate">{booking.provider}</span>
            )}
          </div>
          {(booking.from_location || booking.to_location) && (
            <p className="text-xs text-stone-500 mt-0.5 truncate">
              {[booking.from_location, booking.to_location].filter(Boolean).join(' → ')}
            </p>
          )}
          {booking.departure_date && (
            <p className="text-xs text-stone-400 mt-0.5">
              {formatDate(booking.departure_date)}
              {booking.departure_time ? ` · ${formatTime(booking.departure_time)}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {booking.cost != null && booking.cost > 0 && (
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              {formatCost(booking.cost, booking.currency)}
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2" style={{ borderColor: 'var(--color-border-muted)' }}>
          {booking.arrival_date && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <CalendarDays className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
              <span>
                Arrives {formatDate(booking.arrival_date)}
                {booking.arrival_time ? ` · ${formatTime(booking.arrival_time)}` : ''}
              </span>
            </div>
          )}
          {booking.reference_code && (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Hash className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
              <span className="font-mono">{booking.reference_code}</span>
            </div>
          )}
          {booking.note && (
            <div className="flex items-start gap-2 text-xs text-stone-600">
              <AlignLeft className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
              <span>{booking.note}</span>
            </div>
          )}

          {canEdit && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddTransportForm (inline)
// ---------------------------------------------------------------------------

const TRANSPORT_TYPES: TransportType[] = ['rent', 'bus', 'plane'];

const TYPE_PLACEHOLDERS: Record<TransportType, { provider: string; from: string; to: string; ref: string }> = {
  rent: { provider: 'e.g. Hertz, local agency', from: 'Pick-up location', to: 'Drop-off location', ref: 'Booking ref' },
  bus: { provider: 'e.g. Phuong Trang', from: 'Departure city/station', to: 'Arrival city/station', ref: 'Booking code' },
  plane: { provider: 'e.g. VietJet, Vietnam Airlines', from: 'Origin airport', to: 'Destination airport', ref: 'Flight number / PNR' },
};

function AddTransportForm({
  tripId,
  currency,
  onSaved,
  onCancel,
}: {
  tripId: string;
  currency: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<TransportType>('plane');
  const [provider, setProvider] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depTime, setDepTime] = useState('');
  const [arrDate, setArrDate] = useState('');
  const [arrTime, setArrTime] = useState('');
  const [cost, setCost] = useState('');
  const [refCode, setRefCode] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();
  const loadingToast = useLoadingToast();

  const ph = TYPE_PLACEHOLDERS[type];

  async function handleSave() {
    setSaving(true);
    const resolve = loadingToast('Saving booking…');
    const result = await addTransportBooking({
      tripId,
      transport_type: type,
      provider: provider.trim() || null,
      from_location: from.trim() || null,
      to_location: to.trim() || null,
      departure_date: depDate || null,
      departure_time: depTime || null,
      arrival_date: arrDate || null,
      arrival_time: arrTime || null,
      cost: cost ? parseFloat(cost) : null,
      currency,
      reference_code: refCode.trim() || null,
      note: note.trim() || null,
    });
    setSaving(false);
    if (result.ok) {
      resolve('Booking saved!', 'success');
      emitTripSectionRefresh(tripId, [TRIP_REFRESH_SECTIONS.places, TRIP_REFRESH_SECTIONS.activity]);
      startTransition(() => router.refresh());
      onSaved();
    } else {
      resolve(result.error ?? 'Failed to save', 'error');
    }
  }

  const inputCls = 'w-full rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';
  const inputStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text)' };

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-4">
      {/* Type selector */}
      <div className="flex gap-2">
        {TRANSPORT_TYPES.map((t) => {
          const c = TYPE_COLORS[t];
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={active
                ? { backgroundColor: c.bg, color: c.text, boxShadow: '0 0 0 2px currentColor' }
                : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }
              }
            >
              {transportIcon(t, 'w-3.5 h-3.5')}
              {transportLabel(t)}
            </button>
          );
        })}
      </div>

      {/* Provider + ref */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Provider</label>
          <input className={inputCls} style={inputStyle} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={ph.provider} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Reference / Code</label>
          <input className={inputCls} style={inputStyle} value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder={ph.ref} />
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">From</label>
          <input className={inputCls} style={inputStyle} value={from} onChange={(e) => setFrom(e.target.value)} placeholder={ph.from} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">To</label>
          <input className={inputCls} style={inputStyle} value={to} onChange={(e) => setTo(e.target.value)} placeholder={ph.to} />
        </div>
      </div>

      {/* Departure */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
            {type === 'rent' ? 'Pick-up date' : 'Departure date'}
          </label>
          <input type="date" className={inputCls} style={inputStyle} value={depDate} onChange={(e) => setDepDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Time</label>
          <input type="time" className={inputCls} style={inputStyle} value={depTime} onChange={(e) => setDepTime(e.target.value)} />
        </div>
      </div>

      {/* Arrival */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
            {type === 'rent' ? 'Return date' : 'Arrival date'}
          </label>
          <input type="date" className={inputCls} style={inputStyle} value={arrDate} onChange={(e) => setArrDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Time</label>
          <input type="time" className={inputCls} style={inputStyle} value={arrTime} onChange={(e) => setArrTime(e.target.value)} />
        </div>
      </div>

      {/* Cost */}
      <div>
        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">
          Cost ({currency}) — creates an expense entry
        </label>
        <input
          type="number"
          min="0"
          step="any"
          className={inputCls}
          style={inputStyle}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0"
        />
      </div>

      {/* Note */}
      <div>
        <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">Note</label>
        <textarea
          rows={2}
          className={inputCls + ' resize-none'}
          style={inputStyle}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional notes…"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-3 h-3" />
          Save
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TransportSection
// ---------------------------------------------------------------------------

interface TransportSectionProps {
  bookings: TransportBooking[];
  tripId: string;
  currency: string;
  canEdit: boolean;
}

export function TransportSection({ bookings: initialBookings, tripId, currency, canEdit }: TransportSectionProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [adding, setAdding] = useState(false);

  if (bookings.length === 0 && !canEdit) return null;
  if (bookings.length === 0 && !adding && canEdit) {
    // Render minimal "add" trigger when no bookings yet and section is mounted from outside
    return null; // section is controlled externally; see trip detail page
  }

  return (
    <div className="section-shell mt-4 mb-6 p-5">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm text-blue-600">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
              Getting around
            </p>
            <h2 className="text-lg font-semibold section-title text-stone-800">Transport</h2>
            <p className="text-xs text-stone-400">
              {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
            </p>
          </div>
        </div>

        {canEdit && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {/* Inline add form */}
      {adding && (
        <div className="mb-4">
          <AddTransportForm
            tripId={tripId}
            currency={currency}
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {/* Booking cards */}
      {bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <TransportCard
              key={b.id}
              booking={b}
              canEdit={canEdit}
              tripId={tripId}
              onDeleted={() => setBookings((prev) => prev.filter((x) => x.id !== b.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TransportSectionTrigger — shown when no bookings but canEdit
// ---------------------------------------------------------------------------
export function TransportSectionTrigger({ tripId, currency }: { tripId: string; currency: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-2 mb-6">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-dashed border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add transport booking (flight, bus, car rental)
        </button>
      </div>
    );
  }

  return (
    <div className="section-shell mt-4 mb-6 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm text-blue-600">
          <Plane className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            Getting around
          </p>
          <h2 className="text-lg font-semibold section-title text-stone-800">Transport</h2>
        </div>
      </div>
      <AddTransportForm
        tripId={tripId}
        currency={currency}
        onSaved={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
