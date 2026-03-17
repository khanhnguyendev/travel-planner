'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import type { Category, Place, PlaceReview } from '@/lib/types';
import type { MapboxSuggestion } from '@/features/places/mapbox';
import { useLoadingToast } from '@/components/ui/toast';

interface AddPlaceFormProps {
  projectId: string;
  categories: Category[];
  onAdded?: (place: Place, reviews: PlaceReview[]) => void;
  onCancel?: () => void;
}

function newSessionToken(): string {
  return crypto.randomUUID();
}

export function AddPlaceForm({
  projectId,
  categories,
  onAdded,
  onCancel,
}: AddPlaceFormProps) {
  // Stable session token for the current search session (reused for suggest + retrieve)
  const [sessionToken, setSessionToken] = useState<string>(() => newSessionToken());

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected suggestion state
  const [selected, setSelected] = useState<MapboxSuggestion | null>(null);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [isPending, startTransition] = useTransition();
  const loadingToast = useLoadingToast();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Sync category when categories load after initial render
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !inputRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsSuggestLoading(true);
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          sessionToken,
          projectId,
        });
        const res = await fetch(`/api/places/search?${params.toString()}`);
        const data = (await res.json()) as {
          ok: boolean;
          data?: { suggestions: MapboxSuggestion[] };
        };

        if (data.ok && data.data) {
          setSuggestions(data.data.suggestions);
          setShowDropdown(true);
          setActiveIndex(-1);
        }
      } catch {
        // silently ignore network errors during autocomplete
      } finally {
        setIsSuggestLoading(false);
      }
    },
    [projectId, sessionToken]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setSelected(null);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(value);
    }, 400);
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

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
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

    if (!selected) {
      setError('Please select a place from the suggestions.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    const resolve = loadingToast('Adding place…');

    startTransition(async () => {
      try {
        const res = await fetch('/api/places/retrieve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mapboxId: selected.mapbox_id,
            sessionToken,
            projectId,
            categoryId,
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

        // Reset form with a new session token
        setQuery('');
        setSelected(null);
        setSuggestions([]);
        setShowDropdown(false);
        setError(null);
        setSessionToken(newSessionToken());
      } catch {
        const msg = 'Network error — check your connection and try again.';
        resolve(msg, 'error');
        setError(msg);
      }
    });
  }

  const showNoResults =
    !isSuggestLoading &&
    showDropdown &&
    suggestions.length === 0 &&
    query.trim().length >= 2 &&
    !selected;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search input */}
      <div>
        <label
          htmlFor="place-search"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Search for a place
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--color-text-subtle)' }}
          />
          <input
            ref={inputRef}
            id="place-search"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            placeholder="e.g. Eiffel Tower, Paris"
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
          {/* Clear / loading indicator */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSuggestLoading && !selected && (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-text-subtle)' }} />
            )}
            {selected && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-0.5 rounded-md hover:bg-stone-200 transition-colors"
                style={{ color: 'var(--color-text-subtle)' }}
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <ul
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-lg overflow-hidden"
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
              }}
              role="listbox"
              aria-label="Place suggestions"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.mapbox_id}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => {
                    // Prevent blur before click registers
                    e.preventDefault();
                    handleSelectSuggestion(s);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className="px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    backgroundColor:
                      i === activeIndex
                        ? 'var(--color-bg-subtle)'
                        : undefined,
                  }}
                >
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {s.name}
                  </p>
                  {(s.full_address ?? s.place_formatted) && (
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'var(--color-text-subtle)' }}
                    >
                      {s.full_address ?? s.place_formatted}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* No results message */}
          {showNoResults && (
            <div
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-lg px-4 py-3 text-sm"
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-subtle)',
              }}
            >
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
        {!selected && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
            Type a place name or address to search.
          </p>
        )}
        {selected && (
          <p className="text-xs mt-1" style={{ color: '#0D9488' }}>
            Place selected. Choose a category and click &ldquo;Add place&rdquo;.
          </p>
        )}
      </div>

      {/* Category selector — shown once a place is selected */}
      {selected && (
        <div>
          <label
            htmlFor="category-select"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Category
          </label>
          {categories.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No categories yet — add one first.
            </p>
          ) : (
            <select
              id="category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 bg-white"
              style={{
                borderColor: 'var(--color-border)',
                '--tw-ring-color': '#0D9488',
              } as React.CSSProperties}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{
            backgroundColor: '#FEF2F2',
            color: 'var(--color-error)',
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {selected && (
          <button
            type="submit"
            disabled={isPending || categories.length === 0}
            className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding…
              </>
            ) : (
              'Add place'
            )}
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
