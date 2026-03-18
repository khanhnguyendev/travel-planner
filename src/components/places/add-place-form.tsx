'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { Search, X, Loader2, AlertCircle, MapPin, CalendarDays, Clock, Plus } from 'lucide-react';
import type { Category, Place, PlaceReview } from '@/lib/types';
import type { MapboxSuggestion } from '@/features/places/mapbox';
import { useLoadingToast } from '@/components/ui/toast';
import { extractLocationTag } from '@/lib/address';
import { Dialog } from '@/components/ui/dialog';
import { AddCategoryForm } from '@/components/categories/add-category-form';

interface AddPlaceFormProps {
  tripId: string;
  categories: Category[];
  onAdded?: (place: Place, reviews: PlaceReview[]) => void;
  onCancel?: () => void;
}

function newSessionToken(): string {
  return crypto.randomUUID();
}


export function AddPlaceForm({ tripId, categories, onAdded, onCancel }: AddPlaceFormProps) {
  const [sessionToken, setSessionToken] = useState<string>(() => newSessionToken());
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<MapboxSuggestion | null>(null);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTimeFrom, setVisitTimeFrom] = useState('');
  const [visitTimeTo, setVisitTimeTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPending, startTransition] = useTransition();
  const loadingToast = useLoadingToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!categoryId && localCategories.length > 0) setCategoryId(localCategories[0].id);
  }, [localCategories]); // eslint-disable-line react-hooks/exhaustive-deps

useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (!inputRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    setIsSuggestLoading(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), sessionToken, tripId });
      const res = await fetch(`/api/places/search?${params.toString()}`);
      const data = (await res.json()) as { ok: boolean; data?: { suggestions: MapboxSuggestion[] } };
      if (data.ok && data.data) { setSuggestions(data.data.suggestions); setShowDropdown(true); setActiveIndex(-1); }
    } catch { /* ignore */ } finally { setIsSuggestLoading(false); }
  }, [tripId, sessionToken]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setSelected(null);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchSuggestions(value); }, 400);
  }

  function handleSelectSuggestion(suggestion: MapboxSuggestion) {
    setSelected(suggestion);
    setQuery(suggestion.name);
    setShowDropdown(false);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((prev) => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (activeIndex >= 0 && suggestions[activeIndex]) handleSelectSuggestion(suggestions[activeIndex]); }
    else if (e.key === 'Escape') { setShowDropdown(false); setActiveIndex(-1); }
  }

  function handleClearSelection() {
    setSelected(null);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setError(null);
    inputRef.current?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected) { setError('Please select a place from the suggestions.'); return; }
    if (!categoryId) { setError('Please select a category.'); return; }

    const resolve = loadingToast('Adding place…');
    startTransition(async () => {
      try {
        const res = await fetch('/api/places/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mapboxId: selected.mapbox_id,
            sessionToken,
            tripId,
            categoryId,
            visitDate: visitDate || null,
            visitTimeFrom: visitTimeFrom || null,
            visitTimeTo: visitTimeTo || null,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          data?: { place: Place };
          error?: { code: string; message: string };
        };
        if (!data.ok) {
          const code = data.error?.code ?? 'server_error';
          let msg = data.error?.message ?? 'Failed to add place.';
          if (code === 'conflict') msg = 'This place has already been added.';
          resolve(msg, 'error');
          setError(msg);
          return;
        }
        resolve('Place added!', 'success');
        onAdded?.(data.data!.place, []);
        setQuery(''); setSelected(null); setSuggestions([]); setShowDropdown(false);
        setError(null); setVisitDate(''); setVisitTimeFrom(''); setVisitTimeTo('');
        setSessionToken(newSessionToken());
      } catch {
        const msg = 'Network error — check your connection and try again.';
        resolve(msg, 'error');
        setError(msg);
      }
    });
  }

  const locationTag = selected?.full_address ? extractLocationTag(selected.full_address) : null;
  const showNoResults = !isSuggestLoading && showDropdown && suggestions.length === 0 && query.trim().length >= 2 && !selected;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Search input */}
      <div>
        <label htmlFor="place-search" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
          Search for a place
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-subtle)' }} />
          <input
            ref={inputRef}
            id="place-search"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            placeholder="e.g. Hoan Kiem Lake, Hanoi"
            autoComplete="off"
            readOnly={selected !== null}
            disabled={isPending}
            className="w-full rounded-xl border pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              '--tw-ring-color': '#0D9488',
              backgroundColor: selected ? 'var(--color-bg-subtle)' : undefined,
            } as React.CSSProperties}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSuggestLoading && !selected && <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />}
            {selected && (
              <button type="button" onClick={handleClearSelection} className="p-0.5 rounded-md hover:bg-stone-200 transition-colors" style={{ color: 'var(--color-text-subtle)' }} aria-label="Clear selection">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions — rendered in flow so the dialog scrolls to show them */}
        {showDropdown && suggestions.length > 0 && (
          <ul ref={dropdownRef} className="mt-1 rounded-xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }} role="listbox" aria-label="Place suggestions">
            {suggestions.map((s, i) => (
              <li key={s.mapbox_id} role="option" aria-selected={i === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                onMouseEnter={() => setActiveIndex(i)}
                className="px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0"
                style={{
                  backgroundColor: i === activeIndex ? 'var(--color-bg-subtle)' : undefined,
                  borderColor: 'var(--color-border)',
                }}
              >
                <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>{s.name}</p>
                {(s.full_address ?? s.place_formatted) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{s.full_address ?? s.place_formatted}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {showNoResults && (
          <div className="mt-1 rounded-xl border px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}>
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Preview + form fields — shown after selection */}
      {selected && (
        <>
          {/* Place preview card */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-stone-400">Preview</p>
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1.5">
              <p className="font-bold text-base text-stone-800 leading-snug">{selected.name}</p>
              {(selected.full_address ?? selected.place_formatted) && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-stone-500 leading-snug">{selected.full_address ?? selected.place_formatted}</p>
                </div>
              )}
              {locationTag && (
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  {locationTag}
                </span>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="category-select" className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                Category
              </label>
              <button
                type="button"
                onClick={() => setShowCategoryDialog(true)}
                className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                <Plus className="w-3 h-3" />
                New category
              </button>
            </div>

            {localCategories.length === 0 ? (
              <p className="text-sm text-stone-400">No categories yet — create one first.</p>
            ) : (
              <select id="category-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required disabled={isPending}
                className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 bg-white"
                style={{ borderColor: 'var(--color-border)', '--tw-ring-color': '#0D9488' } as React.CSSProperties}
              >
                {localCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* New category dialog */}
          {showCategoryDialog && (
            <Dialog title="New category" onClose={() => setShowCategoryDialog(false)}>
              <AddCategoryForm
                tripId={tripId}
                onCreated={(cat) => {
                  setLocalCategories((prev) => [...prev, cat]);
                  setCategoryId(cat.id);
                  setShowCategoryDialog(false);
                }}
                onCancel={() => setShowCategoryDialog(false)}
              />
            </Dialog>
          )}

          {/* Schedule (optional) */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
              Visit schedule <span className="text-xs font-normal text-stone-400">(optional)</span>
            </p>
            <div className="space-y-2">
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} disabled={isPending}
                  placeholder="Date"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                  <input type="time" value={visitTimeFrom} onChange={(e) => setVisitTimeFrom(e.target.value)} disabled={isPending}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                    placeholder="From" />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                  <input type="time" value={visitTimeTo} onChange={(e) => setVisitTimeTo(e.target.value)} disabled={isPending}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                    placeholder="To" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: 'var(--color-error)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {selected && (
          <button type="submit" disabled={isPending || categories.length === 0} className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50">
            {isPending ? (<><Loader2 className="w-4 h-4 animate-spin" />Adding…</>) : 'Add place'}
          </button>
        )}
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isPending} className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }}>
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
