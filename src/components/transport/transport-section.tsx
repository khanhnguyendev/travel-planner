'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car, Bus, Plane, Plus, X, Check, Trash2, ChevronDown, ChevronUp,
  CalendarDays, Hash, AlignLeft, ArrowRight, Search, Loader2, MapPin,
} from 'lucide-react';
import type { TransportBooking, TransportType } from '@/lib/types';
import type { MapboxSuggestion } from '@/features/places/mapbox';
import { addTransportBooking, deleteTransportBooking } from '@/features/transport/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';
import { Dialog } from '@/components/ui/dialog';

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
// LocationSearchInput
// ---------------------------------------------------------------------------

function LocationSearchInput({
  tripId,
  value,
  onChange,
  placeholder,
}: {
  tripId: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Keep local query in sync if parent resets value (e.g. "Same as From")
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (!inputRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), sessionToken, tripId });
      const res = await fetch(`/api/places/search?${params}`);
      const json = await res.json() as { ok: boolean; data?: { suggestions: MapboxSuggestion[] } };
      if (json.ok && json.data) {
        setSuggestions(json.data.suggestions);
        setShowDropdown(json.data.suggestions.length > 0);
        setActiveIndex(-1);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [tripId, sessionToken]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // allow free-text
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchSuggestions(val); }, 400);
  }

  function handleSelect(s: MapboxSuggestion) {
    const text = s.name;
    setQuery(text);
    onChange(text);
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && suggestions[activeIndex]) handleSelect(suggestions[activeIndex]); }
    else if (e.key === 'Escape') { setShowDropdown(false); setActiveIndex(-1); }
  }

  const inputCls = 'w-full rounded-lg border pl-8 pr-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';
  const inputStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text)' };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        className={inputCls}
        style={inputStyle}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 animate-spin" />
      )}
      {!loading && query && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); setQuery(''); onChange(''); setSuggestions([]); setShowDropdown(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-stone-400 hover:text-stone-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {showDropdown && suggestions.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border bg-white shadow-lg"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {suggestions.map((s, i) => (
            <li key={s.mapbox_id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${i === activeIndex ? 'bg-teal-50' : 'hover:bg-stone-50'}`}
              >
                <MapPin className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
                <div className="min-w-0">
                  <p className="font-medium text-stone-800 truncate">{s.name}</p>
                  {s.full_address && (
                    <p className="text-xs text-stone-400 truncate">{s.full_address}</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
      >
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
              {booking.from_location && booking.to_location
                ? `${booking.from_location} → ${booking.to_location}`
                : booking.from_location ?? booking.to_location}
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
// AddTransportDialog
// ---------------------------------------------------------------------------

const TRANSPORT_TYPES: TransportType[] = ['rent', 'bus', 'plane'];

const TYPE_PLACEHOLDERS: Record<TransportType, { provider: string; from: string; to: string; ref: string }> = {
  rent: { provider: 'e.g. Hertz, local agency', from: 'Pick-up location', to: 'Drop-off location', ref: 'e.g. ABC123' },
  bus: { provider: 'e.g. Phuong Trang', from: 'Departure city / station', to: 'Arrival city / station', ref: 'e.g. BK-9921' },
  plane: { provider: 'e.g. VietJet, Vietnam Airlines', from: 'Origin airport', to: 'Destination airport', ref: 'e.g. VJ123 / PNR' },
};

function AddTransportDialog({
  tripId,
  currency,
  onSaved,
  onClose,
}: {
  tripId: string;
  currency: string;
  onSaved: () => void;
  onClose: () => void;
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

  const inputCls = 'w-full rounded-lg border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white';
  const inputStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text)' };
  const labelCls = 'block text-xs font-medium text-stone-500 mb-1';

  return (
    <Dialog title="Add transport booking" onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-5">
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={active
                  ? { backgroundColor: c.bg, color: c.text, boxShadow: '0 0 0 2px currentColor' }
                  : { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }
                }
              >
                {transportIcon(t, 'w-4 h-4')}
                {transportLabel(t)}
              </button>
            );
          })}
        </div>

        {/* From / To with Mapbox search */}
        <div className="space-y-3">
          <div>
            <label className={labelCls}>From</label>
            <LocationSearchInput
              tripId={tripId}
              value={from}
              onChange={setFrom}
              placeholder={ph.from}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls + ' mb-0'}>To</label>
              {from.trim() && (
                <button
                  type="button"
                  onClick={() => setTo(from)}
                  className="inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-medium"
                >
                  <ArrowRight className="w-3 h-3" />
                  Same as From
                </button>
              )}
            </div>
            <LocationSearchInput
              tripId={tripId}
              value={to}
              onChange={setTo}
              placeholder={ph.to}
            />
          </div>
        </div>

        {/* Departure */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{type === 'rent' ? 'Pick-up date' : 'Departure date'}</label>
            <input type="date" className={inputCls} style={inputStyle} value={depDate} onChange={(e) => setDepDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input type="time" className={inputCls} style={inputStyle} value={depTime} onChange={(e) => setDepTime(e.target.value)} />
          </div>
        </div>

        {/* Arrival */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{type === 'rent' ? 'Return date' : 'Arrival date'}</label>
            <input type="date" className={inputCls} style={inputStyle} value={arrDate} onChange={(e) => setArrDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input type="time" className={inputCls} style={inputStyle} value={arrTime} onChange={(e) => setArrTime(e.target.value)} />
          </div>
        </div>

        {/* Provider + ref — optional */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Provider <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className={inputCls} style={inputStyle} value={provider} onChange={(e) => setProvider(e.target.value)} placeholder={ph.provider} />
          </div>
          <div>
            <label className={labelCls}>Reference / Code <span className="text-stone-400 font-normal">(optional)</span></label>
            <input className={inputCls} style={inputStyle} value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder={ph.ref} />
          </div>
        </div>

        {/* Cost */}
        <div>
          <label className={labelCls}>
            Cost ({currency})
            <span className="text-stone-400 font-normal ml-1">— creates an expense entry</span>
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
          <label className={labelCls}>Note <span className="text-stone-400 font-normal">(optional)</span></label>
          <textarea
            rows={2}
            className={inputCls + ' resize-none'}
            style={inputStyle}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Seat numbers, luggage allowance, pickup instructions…"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Check className="w-3.5 h-3.5" />
            Save booking
          </button>
        </div>
      </div>
    </Dialog>
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
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {dialogOpen && (
        <AddTransportDialog
          tripId={tripId}
          currency={currency}
          onSaved={() => setDialogOpen(false)}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <div className="section-shell mt-4 mb-6 p-5">
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

          {canEdit && (
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}
        </div>

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
    </>
  );
}

// ---------------------------------------------------------------------------
// TransportSectionTrigger — shown when no bookings but canEdit
// ---------------------------------------------------------------------------
export function TransportSectionTrigger({ tripId, currency }: { tripId: string; currency: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      {dialogOpen && (
        <AddTransportDialog
          tripId={tripId}
          currency={currency}
          onSaved={() => setDialogOpen(false)}
          onClose={() => setDialogOpen(false)}
        />
      )}
      <div className="mt-2 mb-6">
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border border-dashed border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add transport booking (flight, bus, car rental)
        </button>
      </div>
    </>
  );
}
