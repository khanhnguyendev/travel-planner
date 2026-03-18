'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { Place } from '@/lib/types';

interface PlaceSearchProps {
  places: Place[];
  onResults: (filtered: Place[]) => void;
}

export function PlaceSearch({ places, onResults }: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!query.trim()) {
        onResults(places);
        return;
      }
      const q = query.toLowerCase();
      const filtered = places.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.address ?? '').toLowerCase().includes(q) ||
          (p.editorial_summary ?? '').toLowerCase().includes(q)
      );
      onResults(filtered);
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, places]);

  function handleClear() {
    setQuery('');
    onResults(places);
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--color-text-subtle)' }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places…"
          className="w-full rounded-[1.1rem] border pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'rgba(255,255,255,0.92)',
            color: 'var(--color-text)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-stone-100"
            style={{ color: 'var(--color-text-subtle)' }}
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {query.trim() && (
        <p className="px-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          {places.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              (p.address ?? '').toLowerCase().includes(query.toLowerCase()) ||
              (p.editorial_summary ?? '').toLowerCase().includes(query.toLowerCase())
          ).length} results
        </p>
      )}
    </div>
  );
}
